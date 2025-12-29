import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsAnalysis } from '../metrics/MetricsAnalysis';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { World } from '../World';

describe('MetricsAnalysis', () => {
  let analysis: MetricsAnalysis;
  let collector: MetricsCollector;
  let world: World;

  beforeEach(() => {
    world = new World();
    collector = new MetricsCollector(world);
    analysis = new MetricsAnalysis(collector);
  });

  describe('Initialization', () => {
    it('should require a MetricsCollector instance', () => {
      expect(() => new MetricsAnalysis(null as any)).toThrow('MetricsAnalysis requires a MetricsCollector instance');
    });
  });

  describe('Automatic Insights Generation', () => {
    it('should generate insight for population stall', () => {
      // Simulate stalled population growth
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000), // Every hour
          population: 100 // Same population
        });
      }

      const insights = analysis.generateInsights();
      const stallInsight = insights.find(i => i.type === 'population_stall');

      expect(stallInsight).toBeDefined();
      expect(stallInsight?.message).toContain('stalled');
      expect(stallInsight?.severity).toBe('warning');
    });

    it('should generate insight for food shortage', () => {
      collector.recordEvent({
        type: 'resource:gathered',
        timestamp: Date.now(),
        agentId: 'agent-1',
        resourceType: 'food',
        amount: 100,
        gatherTime: 10
      });

      collector.recordEvent({
        type: 'resource:consumed',
        timestamp: Date.now(),
        agentId: 'agent-1',
        resourceType: 'food',
        amount: 150,
        purpose: 'eating'
      });

      const insights = analysis.generateInsights();
      const shortageInsight = insights.find(i => i.type === 'resource_shortage');

      expect(shortageInsight).toBeDefined();
      expect(shortageInsight?.message).toContain('consumption exceeds production');
      expect(shortageInsight?.severity).toBe('critical');
    });

    it('should generate insight for intelligence decline', () => {
      collector.recordEvent({
        type: 'generation:completed',
        timestamp: 1000,
        generation: 1,
        avgIntelligence: 80
      });

      collector.recordEvent({
        type: 'generation:completed',
        timestamp: 2000,
        generation: 2,
        avgIntelligence: 78
      });

      collector.recordEvent({
        type: 'generation:completed',
        timestamp: 3000,
        generation: 3,
        avgIntelligence: 76
      });

      const insights = analysis.generateInsights();
      const declineInsight = insights.find(i => i.type === 'intelligence_decline');

      expect(declineInsight).toBeDefined();
      expect(declineInsight?.severity).toBe('warning');
    });

    it('should generate insight for survival rate improvement', () => {
      collector.recordEvent({
        type: 'survival_rate:calculated',
        timestamp: 1000,
        rate: 0.5,
        context: 'before_shelters'
      });

      collector.recordEvent({
        type: 'survival_rate:calculated',
        timestamp: 2000,
        rate: 0.65,
        context: 'after_shelters'
      });

      const insights = analysis.generateInsights();
      const improvementInsight = insights.find(i => i.type === 'survival_improvement');

      expect(improvementInsight).toBeDefined();
      expect(improvementInsight?.message).toContain('30%');
      expect(improvementInsight?.severity).toBe('info');
    });

    it('should generate insight for primary cause of death', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'agent:death',
          timestamp: Date.now(),
          agentId: `agent-${i}`,
          causeOfDeath: i < 5 ? 'hunger' : 'thirst',
          ageAtDeath: 100,
          finalStats: { health: 0, hunger: 0, thirst: 0, energy: 0 }
        });
      }

      const insights = analysis.generateInsights();
      const deathInsight = insights.find(i => i.type === 'primary_death_cause');

      expect(deathInsight).toBeDefined();
      expect(deathInsight?.message).toContain('hunger');
      expect(deathInsight?.message).toContain('50%');
    });

    it('should not generate insights when insufficient data', () => {
      const insights = analysis.generateInsights();
      expect(insights.length).toBe(0);
    });

    it('should include actionable recommendations in insights', () => {
      collector.recordEvent({
        type: 'resource:gathered',
        timestamp: Date.now(),
        agentId: 'agent-1',
        resourceType: 'food',
        amount: 50,
        gatherTime: 10
      });

      collector.recordEvent({
        type: 'resource:consumed',
        timestamp: Date.now(),
        agentId: 'agent-1',
        resourceType: 'food',
        amount: 100,
        purpose: 'eating'
      });

      const insights = analysis.generateInsights();
      const insight = insights[0];

      expect(insight.recommendations).toBeDefined();
      expect(insight.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Anomaly Detection', () => {
    it('should detect population spike anomaly', () => {
      // Normal population
      for (let i = 0; i < 5; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000),
          population: 100 + i
        });
      }

      // Sudden spike
      collector.recordEvent({
        type: 'population:sampled',
        timestamp: Date.now() + (6 * 3600000),
        population: 200
      });

      const anomalies = analysis.detectAnomalies('population');
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('spike');
    });

    it('should detect resource depletion anomaly', () => {
      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: 1000,
        resourceType: 'wood',
        amount: 1000
      });

      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: 2000,
        resourceType: 'wood',
        amount: 0
      });

      const anomalies = analysis.detectAnomalies('stockpile_wood');
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('depletion');
    });

    it('should detect FPS drop anomaly', () => {
      // Normal FPS
      for (let i = 0; i < 10; i++) {
        collector.samplePerformance({
          fps: 60,
          tickDuration: 16,
          entityCount: 100,
          memoryUsage: 50000000
        }, Date.now() + (i * 1000));
      }

      // Sudden drop
      collector.samplePerformance({
        fps: 15,
        tickDuration: 66,
        entityCount: 100,
        memoryUsage: 50000000
      }, Date.now() + (11 * 1000));

      const anomalies = analysis.detectAnomalies('fps');
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].severity).toBeGreaterThan(5);
    });

    it('should calculate anomaly severity score', () => {
      collector.recordEvent({
        type: 'population:sampled',
        timestamp: 1000,
        population: 100
      });

      collector.recordEvent({
        type: 'population:sampled',
        timestamp: 2000,
        population: 500 // 5x increase
      });

      const anomalies = analysis.detectAnomalies('population');
      expect(anomalies[0].severity).toBeGreaterThan(8);
    });

    it('should not detect anomalies in normal variance', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000),
          population: 100 + Math.random() * 5 // Normal variance
        });
      }

      const anomalies = analysis.detectAnomalies('population');
      expect(anomalies.length).toBe(0);
    });
  });

  describe('Correlation Analysis', () => {
    it('should find positive correlation between intelligence and lifespan', () => {
      // High intelligence, long lifespan
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100, intelligence: 90 }
      });

      collector.recordEvent({
        type: 'agent:death',
        timestamp: 10000,
        agentId: 'agent-1',
        causeOfDeath: 'old_age',
        ageAtDeath: 200,
        finalStats: { health: 0, hunger: 50, thirst: 50, energy: 0 }
      });

      // Low intelligence, short lifespan
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 0,
        agentId: 'agent-2',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100, intelligence: 50 }
      });

      collector.recordEvent({
        type: 'agent:death',
        timestamp: 5000,
        agentId: 'agent-2',
        causeOfDeath: 'hunger',
        ageAtDeath: 100,
        finalStats: { health: 0, hunger: 0, thirst: 50, energy: 20 }
      });

      const correlation = analysis.findCorrelations('intelligence', 'lifespan');
      expect(correlation.coefficient).toBeGreaterThan(0.5);
      expect(correlation.strength).toBe('strong');
      expect(correlation.direction).toBe('positive');
    });

    it('should find negative correlation between hunger crises and health', () => {
      // Create agents first
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 500,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 500,
        agentId: 'agent-2',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      // Many hunger crises, low health
      collector.sampleMetrics('agent-1', {
        hunger: 5,
        thirst: 100,
        energy: 100,
        temperature: 20,
        health: 40
      }, 1000);

      collector.sampleMetrics('agent-1', {
        hunger: 8,
        thirst: 100,
        energy: 100,
        temperature: 20,
        health: 35
      }, 2000);

      // Few hunger crises, high health
      collector.sampleMetrics('agent-2', {
        hunger: 80,
        thirst: 100,
        energy: 100,
        temperature: 20,
        health: 95
      }, 1000);

      collector.sampleMetrics('agent-2', {
        hunger: 85,
        thirst: 100,
        energy: 100,
        temperature: 20,
        health: 98
      }, 2000);

      const correlation = analysis.findCorrelations('hunger_crises', 'health');
      expect(correlation.coefficient).toBeLessThan(-0.5);
      expect(correlation.direction).toBe('negative');
    });

    it('should detect no correlation when variables are independent', () => {
      // Create agents with random intelligence and random lifespans (no correlation)
      for (let i = 0; i < 10; i++) {
        const intelligence = 50 + (i % 2) * 10; // Alternating 50, 60
        const lifespan = 100 + ((i + 5) % 3) * 50; // Random pattern 100, 150, 200

        collector.recordEvent({
          type: 'agent:birth',
          timestamp: i * 1000,
          agentId: `agent-${i}`,
          generation: 1,
          parents: null,
          initialStats: {
            health: 100,
            hunger: 100,
            thirst: 100,
            energy: 100,
            intelligence
          }
        });

        collector.recordEvent({
          type: 'agent:death',
          timestamp: i * 1000 + lifespan,
          agentId: `agent-${i}`,
          causeOfDeath: 'old_age',
          ageAtDeath: lifespan,
          finalStats: { health: 0, hunger: 50, thirst: 50, energy: 0 }
        });
      }

      const correlation = analysis.findCorrelations('intelligence', 'lifespan');
      expect(Math.abs(correlation.coefficient)).toBeLessThan(0.3);
      expect(correlation.strength).toBe('weak');
    });

    it('should calculate correlation with sufficient sample size', () => {
      expect(() => {
        analysis.findCorrelations('metric1', 'metric2');
      }).toThrow('Insufficient data for correlation analysis (minimum 2 samples required)');
    });

    it('should generate human-readable correlation description', () => {
      // Setup data
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'agent:birth',
          timestamp: i * 1000,
          agentId: `agent-${i}`,
          generation: 1,
          parents: null,
          initialStats: {
            health: 100,
            hunger: 100,
            thirst: 100,
            energy: 100,
            intelligence: 50 + i * 5
          }
        });

        collector.recordEvent({
          type: 'agent:death',
          timestamp: (i + 10) * 1000,
          agentId: `agent-${i}`,
          causeOfDeath: 'old_age',
          ageAtDeath: 100 + i * 10,
          finalStats: { health: 0, hunger: 50, thirst: 50, energy: 0 }
        });
      }

      const correlation = analysis.findCorrelations('intelligence', 'lifespan');
      expect(correlation.description).toBeDefined();
      expect(correlation.description.length).toBeGreaterThan(0);
    });
  });

  describe('Trend Detection', () => {
    it('should detect increasing trend', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000),
          population: 100 + i * 10
        });
      }

      const trend = analysis.detectTrend('population');
      expect(trend).toBe('increasing');
    });

    it('should detect decreasing trend', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000),
          population: 100 - i * 5
        });
      }

      const trend = analysis.detectTrend('population');
      expect(trend).toBe('decreasing');
    });

    it('should detect stable trend', () => {
      // Use alternating small deviations to ensure no autocorrelation pattern
      const deviations = [0.5, -0.4, 0.3, -0.5, 0.4, -0.3, 0.2, -0.4, 0.5, -0.2];
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000),
          population: 100 + deviations[i]! // Deterministic small variance
        });
      }

      const trend = analysis.detectTrend('population');
      expect(trend).toBe('stable');
    });

    it('should detect cyclic trend', () => {
      // Create a stronger cyclic pattern with period of 4
      for (let i = 0; i < 24; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000),
          population: 100 + Math.sin(i * Math.PI / 2) * 30 // Stronger sine wave with period 4
        });
      }

      const trend = analysis.detectTrend('population');
      expect(trend).toBe('cyclic');
    });

    it('should provide trend confidence score', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000),
          population: 100 + i * 10
        });
      }

      const trendData = analysis.getTrendData('population');
      expect(trendData.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate rate of change for trends', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: i * 3600000, // Every hour
          population: 100 + i * 5
        });
      }

      const trendData = analysis.getTrendData('population');
      expect(trendData.rateOfChange).toBeCloseTo(5, 1); // 5 per hour
    });
  });

  describe('Pattern Recognition', () => {
    it('should recognize specialization pattern', () => {
      // Agent 1 only gathers wood
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'resource:gathered',
          timestamp: Date.now() + (i * 1000),
          agentId: 'agent-1',
          resourceType: 'wood',
          amount: 5,
          gatherTime: 3
        });
      }

      // Agent 2 only gathers food
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'resource:gathered',
          timestamp: Date.now() + (i * 1000),
          agentId: 'agent-2',
          resourceType: 'food',
          amount: 3,
          gatherTime: 2
        });
      }

      const patterns = analysis.recognizePatterns();
      const specializationPattern = patterns.find(p => p.type === 'specialization');

      expect(specializationPattern).toBeDefined();
      expect(specializationPattern?.confidence).toBeGreaterThan(0.7);
    });

    it('should recognize trade route pattern', () => {
      // Create agent first
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: 500,
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      // Agent repeatedly moving between two locations (need > 1000 total distance)
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'agent:moved',
          timestamp: Date.now() + (i * 1000),
          agentId: 'agent-1',
          distance: 150
        });
      }

      const patterns = analysis.recognizePatterns();
      const tradePattern = patterns.find(p => p.type === 'trade_route');

      expect(tradePattern).toBeDefined();
    });

    it('should recognize social clustering pattern', () => {
      // Group of agents frequently interacting
      const group1 = ['agent-1', 'agent-2', 'agent-3'];

      // Within-group interactions - need to form relationships
      for (let i = 0; i < 10; i++) {
        const agent1 = group1[i % 3];
        const agent2 = group1[(i + 1) % 3];

        collector.recordEvent({
          type: 'conversation:started',
          timestamp: Date.now() + (i * 1000),
          participants: [agent1, agent2],
          duration: 30
        });

        // Record relationship formation
        collector.recordEvent({
          type: 'relationship:formed',
          timestamp: Date.now() + (i * 1000),
          agent1,
          agent2
        });
      }

      const patterns = analysis.recognizePatterns();
      const clusteringPattern = patterns.find(p => p.type === 'social_clustering');

      expect(clusteringPattern).toBeDefined();
    });

    it('should include pattern metadata', () => {
      // Setup a recognizable pattern
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'resource:gathered',
          timestamp: Date.now() + (i * 1000),
          agentId: 'agent-1',
          resourceType: 'wood',
          amount: 5,
          gatherTime: 3
        });
      }

      const patterns = analysis.recognizePatterns();
      if (patterns.length > 0) {
        expect(patterns[0].firstObserved).toBeDefined();
        expect(patterns[0].lastObserved).toBeDefined();
        expect(patterns[0].occurrences).toBeGreaterThan(0);
      }
    });
  });

  describe('Performance Analysis', () => {
    it('should identify performance bottlenecks', () => {
      collector.recordEvent({
        type: 'system:tick',
        timestamp: Date.now(),
        system: 'aiSystem',
        duration: 50
      });

      collector.recordEvent({
        type: 'system:tick',
        timestamp: Date.now(),
        system: 'physicsSystem',
        duration: 5
      });

      collector.recordEvent({
        type: 'system:tick',
        timestamp: Date.now(),
        system: 'renderSystem',
        duration: 10
      });

      const bottlenecks = analysis.findPerformanceBottlenecks();
      expect(bottlenecks[0].system).toBe('aiSystem');
      expect(bottlenecks[0].impact).toBe('high');
    });

    it('should suggest optimization opportunities', () => {
      // High pathfinding failure rate
      for (let i = 0; i < 100; i++) {
        collector.recordEvent({
          type: 'pathfinding:failed',
          timestamp: Date.now() + (i * 100),
          agentId: `agent-${i % 10}`,
          from: { x: 0, y: 0 },
          to: { x: 100, y: 100 }
        });
      }

      const suggestions = analysis.getOptimizationSuggestions();
      const pathfindingSuggestion = suggestions.find(s => s.area === 'pathfinding');

      expect(pathfindingSuggestion).toBeDefined();
      expect(pathfindingSuggestion?.priority).toBe('high');
    });

    it('should calculate performance score', () => {
      collector.samplePerformance({
        fps: 60,
        tickDuration: 16,
        entityCount: 100,
        memoryUsage: 50000000
      }, Date.now());

      const score = analysis.calculatePerformanceScore();
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should throw when analyzing non-existent metric', () => {
      expect(() => {
        analysis.detectAnomalies('nonexistent_metric');
      }).toThrow('Cannot analyze non-existent metric: nonexistent_metric');
    });

    it('should throw when finding correlations with insufficient data', () => {
      collector.recordEvent({
        type: 'test:metric1',
        timestamp: 1000,
        value: 10
      });

      expect(() => {
        analysis.findCorrelations('metric1', 'metric2');
      }).toThrow('Insufficient data for correlation analysis');
    });

    it('should handle missing timestamps gracefully', () => {
      expect(() => {
        analysis.detectTrend('population');
      }).toThrow('Cannot detect trend: no data available');
    });
  });
});
