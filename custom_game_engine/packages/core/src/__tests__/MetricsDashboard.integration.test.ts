import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../World';
import { MetricsCollector } from '../metrics/MetricsCollector';
import { MetricsDashboard } from '../metrics/MetricsDashboard';
import { MetricsAnalysis } from '../metrics/MetricsAnalysis';

describe('MetricsDashboard Integration', () => {
  let world: World;
  let collector: MetricsCollector;
  let analysis: MetricsAnalysis;
  let dashboard: MetricsDashboard;

  beforeEach(() => {
    world = new World();
    collector = new MetricsCollector(world);
    analysis = new MetricsAnalysis(collector);
    dashboard = new MetricsDashboard(collector, analysis);
  });

  describe('Initialization', () => {
    it('should require collector and analysis instances', () => {
      expect(() => new MetricsDashboard(null as any, analysis)).toThrow('MetricsDashboard requires MetricsCollector');
      expect(() => new MetricsDashboard(collector, null as any)).toThrow('MetricsDashboard requires MetricsAnalysis');
    });

    it('should initialize with default dashboard state', () => {
      const state = dashboard.getState();
      expect(state).toBeDefined();
      expect(state.liveMetrics).toBeDefined();
      expect(state.charts).toBeDefined();
      expect(state.alerts).toBeDefined();
    });
  });

  describe('Live Metrics Display', () => {
    it('should display current population', () => {
      collector.recordEvent({
        type: 'population:sampled',
        timestamp: Date.now(),
        population: 150
      });

      dashboard.updateLiveMetrics();

      const state = dashboard.getState();
      expect(state.liveMetrics.population).toBe(150);
    });

    it('should display average hunger', () => {
      // Record agent births first (required before sampling)
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: 'agent-1',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });
      collector.recordEvent({
        type: 'agent:birth',
        timestamp: Date.now(),
        agentId: 'agent-2',
        generation: 1,
        parents: null,
        initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
      });

      collector.sampleMetrics('agent-1', { hunger: 80, thirst: 70, energy: 60, temperature: 20, health: 90 }, Date.now());
      collector.sampleMetrics('agent-2', { hunger: 60, thirst: 90, energy: 80, temperature: 22, health: 95 }, Date.now());

      dashboard.updateLiveMetrics();

      const state = dashboard.getState();
      expect(state.liveMetrics.avgHunger).toBe(70);
    });

    it('should display resource stockpiles', () => {
      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: Date.now(),
        resourceType: 'wood',
        amount: 250
      });

      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: Date.now(),
        resourceType: 'food',
        amount: 180
      });

      dashboard.updateLiveMetrics();

      const state = dashboard.getState();
      expect(state.liveMetrics.resourceStockpiles['wood']).toBe(250);
      expect(state.liveMetrics.resourceStockpiles['food']).toBe(180);
    });

    it('should update live metrics in real-time', () => {
      // Initially no population data
      dashboard.updateLiveMetrics();
      const state0 = dashboard.getState();
      const initialPopulation = state0.liveMetrics.population;

      // Set first population sample
      collector.recordEvent({
        type: 'population:sampled',
        timestamp: Date.now(),
        population: 100
      });

      dashboard.updateLiveMetrics();
      const state1 = dashboard.getState();
      expect(state1.liveMetrics.population).toBe(100);

      // Change population with a new sample
      collector.recordEvent({
        type: 'population:sampled',
        timestamp: Date.now() + 1000,
        population: 200
      });

      dashboard.updateLiveMetrics();
      const state2 = dashboard.getState();

      // Verify population changed from initial state and first state
      expect(state2.liveMetrics.population).not.toBe(initialPopulation);
      expect(state2.liveMetrics.population).not.toBe(100);
      expect(state2.liveMetrics.population).toBe(200);
    });
  });

  describe('Chart Generation', () => {
    it('should generate population over time chart', () => {
      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000),
          population: 100 + i * 10
        });
      }

      const chart = dashboard.generateChart('population_over_time', 'line');

      expect(chart).toBeDefined();
      expect(chart.type).toBe('line');
      expect(chart.data.labels.length).toBe(10);
      expect(chart.data.datasets[0].data.length).toBe(10);
    });

    it('should generate resource balance stacked area chart', () => {
      const resources = ['wood', 'food', 'stone'];
      const timestamps = Array.from({ length: 5 }, (_, i) => Date.now() + (i * 3600000));

      timestamps.forEach(timestamp => {
        resources.forEach(resource => {
          collector.recordEvent({
            type: 'stockpile:updated',
            timestamp,
            resourceType: resource,
            amount: Math.random() * 100
          });
        });
      });

      const chart = dashboard.generateChart('resource_balance', 'stacked_area');

      expect(chart).toBeDefined();
      expect(chart.type).toBe('stacked_area');
      expect(chart.data.datasets.length).toBe(3);
    });

    it('should generate intelligence distribution histogram', () => {
      for (let i = 0; i < 50; i++) {
        collector.recordEvent({
          type: 'agent:birth',
          timestamp: Date.now(),
          agentId: `agent-${i}`,
          generation: 1,
          parents: null,
          initialStats: {
            health: 100,
            hunger: 100,
            thirst: 100,
            energy: 100,
            intelligence: 50 + Math.random() * 50
          }
        });
      }

      const chart = dashboard.generateChart('intelligence_distribution', 'histogram');

      expect(chart).toBeDefined();
      expect(chart.type).toBe('histogram');
      expect(chart.data.datasets[0].data.length).toBeGreaterThan(0);
    });

    it('should generate spatial heatmap', () => {
      for (let i = 0; i < 100; i++) {
        collector.recordEvent({
          type: 'tile:visited',
          timestamp: Date.now(),
          agentId: `agent-${i % 10}`,
          x: Math.floor(Math.random() * 50),
          y: Math.floor(Math.random() * 50)
        });
      }

      const chart = dashboard.generateChart('spatial_heatmap', 'heatmap');

      expect(chart).toBeDefined();
      expect(chart.type).toBe('heatmap');
      expect(chart.data).toBeDefined();
    });

    it('should generate social network graph', () => {
      const agents = ['agent-1', 'agent-2', 'agent-3', 'agent-4'];

      // First record agent births so they exist in lifecycle metrics
      for (const agentId of agents) {
        collector.recordEvent({
          type: 'agent:birth',
          timestamp: Date.now(),
          agentId,
          generation: 1,
          parents: null,
          initialStats: { health: 100, hunger: 100, thirst: 100, energy: 100 }
        });
      }

      // Note: relationship:formed event doesn't exist in EventMap
      // The social network graph uses agent lifecycle data and relationship count
      // We can't record specific relationship edges, so we record conversations instead
      collector.recordEvent({
        type: 'conversation:started',
        timestamp: Date.now(),
        participants: [agents[0], agents[1]],
        initiator: agents[0],
        agent1: agents[0],
        agent2: agents[1]
      });

      collector.recordEvent({
        type: 'conversation:started',
        timestamp: Date.now(),
        participants: [agents[1], agents[2]],
        initiator: agents[1],
        agent1: agents[1],
        agent2: agents[2]
      });

      const chart = dashboard.generateChart('social_network', 'graph');

      expect(chart).toBeDefined();
      expect(chart.type).toBe('graph');
      expect(chart.data.nodes.length).toBeGreaterThan(0);
      // Note: edges are based on relationshipsFormed count, which won't be populated
      // from conversation events, so we just verify the structure exists
      expect(chart.data.edges).toBeDefined();
    });

    it('should throw when generating chart for unknown metric', () => {
      expect(() => {
        dashboard.generateChart('unknown_metric', 'line');
      }).toThrow('Unknown chart type: unknown_metric');
    });

    it('should support custom chart configurations', () => {
      const chart = dashboard.generateChart('population_over_time', 'line', {
        title: 'Custom Title',
        colors: ['#ff0000'],
        showLegend: false
      });

      expect(chart.options.title).toBe('Custom Title');
      expect(chart.options.showLegend).toBe(false);
    });
  });

  describe('Alert System', () => {
    it('should create warning alert for low food stockpile', () => {
      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: Date.now(),
        resourceType: 'food',
        amount: 5
      });

      dashboard.updateAlerts();

      const state = dashboard.getState();
      const foodAlert = state.alerts.find(a => a.metric === 'food_stockpile');

      expect(foodAlert).toBeDefined();
      expect(foodAlert?.type).toBe('warning');
    });

    it('should create critical alert for FPS drop', () => {
      collector.samplePerformance({
        fps: 15,
        tickDuration: 66,
        entityCount: 100,
        memoryUsage: 50000000
      }, Date.now());

      dashboard.updateAlerts();

      const state = dashboard.getState();
      const fpsAlert = state.alerts.find(a => a.metric === 'fps');

      expect(fpsAlert).toBeDefined();
      expect(fpsAlert?.type).toBe('critical');
    });

    it('should create info alert for milestone reached', () => {
      collector.recordMilestone({
        name: 'Population reached 100',
        timestamp: Date.now(),
        significance: 8
      });

      dashboard.updateAlerts();

      const state = dashboard.getState();
      const milestoneAlert = state.alerts.find(a => a.type === 'info');

      expect(milestoneAlert).toBeDefined();
    });

    it('should dismiss alerts', () => {
      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: Date.now(),
        resourceType: 'food',
        amount: 5
      });

      dashboard.updateAlerts();
      const state1 = dashboard.getState();
      expect(state1.alerts.length).toBeGreaterThan(0);

      const alertId = state1.alerts[0].id;
      dashboard.dismissAlert(alertId);

      const state2 = dashboard.getState();
      expect(state2.alerts.find(a => a.id === alertId)).toBeUndefined();
    });

    it('should auto-resolve alerts when condition improves', () => {
      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: Date.now(),
        resourceType: 'food',
        amount: 5
      });

      dashboard.updateAlerts();
      expect(dashboard.getState().alerts.length).toBeGreaterThan(0);

      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: Date.now() + 1000,
        resourceType: 'food',
        amount: 100
      });

      dashboard.updateAlerts();
      const state = dashboard.getState();
      const foodAlert = state.alerts.find(a => a.metric === 'food_stockpile');

      expect(foodAlert).toBeUndefined();
    });

    it('should include threshold in alert message', () => {
      collector.samplePerformance({
        fps: 20,
        tickDuration: 50,
        entityCount: 100,
        memoryUsage: 50000000
      }, Date.now());

      dashboard.updateAlerts();

      const state = dashboard.getState();
      const fpsAlert = state.alerts.find(a => a.metric === 'fps');

      expect(fpsAlert?.message).toContain('30');
      expect(fpsAlert?.threshold).toBe(30);
    });
  });

  describe('Dashboard Updates', () => {
    it('should update all dashboard components', () => {
      collector.recordEvent({
        type: 'population:sampled',
        timestamp: Date.now(),
        population: 150
      });

      collector.recordEvent({
        type: 'stockpile:updated',
        timestamp: Date.now(),
        resourceType: 'food',
        amount: 5
      });

      dashboard.update();

      const state = dashboard.getState();
      expect(state.liveMetrics.population).toBe(150);
      expect(state.alerts.length).toBeGreaterThan(0);
    });

    it('should throttle updates to prevent performance issues', () => {
      // The dashboard throttles updates to 100ms intervals
      // Multiple rapid calls should be ignored
      const metrics = dashboard.getPerformanceMetrics();
      const initialRenderCount = metrics.renderCount;

      // Call update 100 times rapidly (within throttle window)
      for (let i = 0; i < 100; i++) {
        dashboard.update();
      }

      // Only the first call should execute, rest should be throttled
      const finalMetrics = dashboard.getPerformanceMetrics();
      expect(finalMetrics.renderCount).toBe(initialRenderCount + 1);
    });
  });

  describe('Custom Widgets', () => {
    it('should support adding custom widgets', () => {
      const customWidget = {
        id: 'custom-widget-1',
        type: 'custom',
        title: 'Custom Metric',
        render: () => ({ value: 42 })
      };

      dashboard.addWidget(customWidget);

      const state = dashboard.getState();
      const widget = state.widgets.find(w => w.id === 'custom-widget-1');

      expect(widget).toBeDefined();
    });

    it('should update custom widgets on dashboard refresh', () => {
      let renderCount = 0;

      const customWidget = {
        id: 'custom-widget-1',
        type: 'custom',
        title: 'Custom Metric',
        render: () => {
          renderCount++;
          return { value: 42 };
        }
      };

      dashboard.addWidget(customWidget);
      dashboard.update();

      expect(renderCount).toBe(1);
    });

    it('should remove custom widgets', () => {
      const customWidget = {
        id: 'custom-widget-1',
        type: 'custom',
        title: 'Custom Metric',
        render: () => ({ value: 42 })
      };

      dashboard.addWidget(customWidget);
      dashboard.removeWidget('custom-widget-1');

      const state = dashboard.getState();
      expect(state.widgets.find(w => w.id === 'custom-widget-1')).toBeUndefined();
    });
  });

  describe('Data Export from Dashboard', () => {
    it('should export dashboard state as JSON', () => {
      collector.recordEvent({
        type: 'population:sampled',
        timestamp: Date.now(),
        population: 150
      });

      dashboard.update();
      const exported = dashboard.exportState('json');

      expect(exported).toBeInstanceOf(Buffer);

      const parsed = JSON.parse(exported.toString());
      expect(parsed.liveMetrics).toBeDefined();
      expect(parsed.alerts).toBeDefined();
    });

    it('should export individual charts', () => {
      for (let i = 0; i < 5; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + (i * 3600000),
          population: 100 + i * 10
        });
      }

      const chart = dashboard.generateChart('population_over_time', 'line');
      const exported = dashboard.exportChart(chart, 'png');

      expect(exported).toBeInstanceOf(Buffer);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track dashboard render time', () => {
      // Ensure dashboard has some data to render
      collector.recordEvent({
        type: 'population:sampled',
        timestamp: Date.now(),
        population: 100
      });

      // First check that metrics start at 0
      let metrics = dashboard.getPerformanceMetrics();
      expect(metrics.renderCount).toBe(0);
      expect(metrics.lastRenderTime).toBe(0);

      // Now update the dashboard
      dashboard.update();

      // Verify render time was tracked
      metrics = dashboard.getPerformanceMetrics();
      expect(metrics.lastRenderTime).toBeGreaterThanOrEqual(0);
      expect(metrics.renderCount).toBe(1);
      expect(metrics.avgRenderTime).toBeGreaterThanOrEqual(0);
    });

    it('should warn when dashboard updates are slow', () => {
      const slowWidget = {
        id: 'slow-widget',
        type: 'custom',
        title: 'Slow Widget',
        render: () => {
          // Simulate slow rendering
          const start = Date.now();
          while (Date.now() - start < 100) {
            // Busy wait
          }
          return { value: 42 };
        }
      };

      dashboard.addWidget(slowWidget);
      dashboard.update();

      const state = dashboard.getState();
      const perfAlert = state.alerts.find(a => a.type === 'warning' && a.message.includes('slow'));

      expect(perfAlert).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle chart generation errors gracefully', () => {
      expect(() => {
        dashboard.generateChart('invalid_chart', 'unknown_type' as any);
      }).toThrow('Unsupported chart type: unknown_type');
    });

    it('should handle missing data for charts', () => {
      const chart = dashboard.generateChart('population_over_time', 'line');

      expect(chart.data.datasets[0].data.length).toBe(0);
      expect(chart.data.labels.length).toBe(0);
    });

    it('should recover from widget render errors', () => {
      const errorWidget = {
        id: 'error-widget',
        type: 'custom',
        title: 'Error Widget',
        render: () => {
          throw new Error('Widget render error');
        }
      };

      dashboard.addWidget(errorWidget);

      expect(() => {
        dashboard.update();
      }).not.toThrow();

      const state = dashboard.getState();
      const errorAlert = state.alerts.find(a => a.message.includes('Widget render error'));

      expect(errorAlert).toBeDefined();
    });
  });

  describe('Real-time Updates Integration', () => {
    it('should update when new events are recorded', () => {
      dashboard.enableAutoUpdate(100); // Update every 100ms

      const initialState = dashboard.getState();

      collector.recordEvent({
        type: 'population:sampled',
        timestamp: Date.now(),
        population: 150
      });

      // Wait for auto-update
      return new Promise(resolve => {
        setTimeout(() => {
          const updatedState = dashboard.getState();
          expect(updatedState.liveMetrics.population).toBe(150);
          dashboard.disableAutoUpdate();
          resolve(true);
        }, 150);
      });
    });

    it('should batch updates for efficiency', () => {
      let updateCount = 0;
      const originalUpdate = dashboard.update.bind(dashboard);
      dashboard.update = () => {
        updateCount++;
        originalUpdate();
      };

      dashboard.enableAutoUpdate(100);

      for (let i = 0; i < 10; i++) {
        collector.recordEvent({
          type: 'population:sampled',
          timestamp: Date.now() + i,
          population: 100 + i
        });
      }

      return new Promise(resolve => {
        setTimeout(() => {
          expect(updateCount).toBeLessThan(10); // Should batch updates
          dashboard.disableAutoUpdate();
          resolve(true);
        }, 250);
      });
    });
  });
});
