import { describe, it, expect } from 'vitest';
import {
  transformNetworkData,
  transformTimelineData,
  transformSpatialData,
  transformInequalityData,
  transformCulturalData,
  calculateCorrelation,
} from '@/utils/dataTransformers';
import {
  mockNetworkData,
  mockTimelineData,
  mockSpatialData,
  mockInequalityData,
  mockCulturalData,
} from '../mockData';

describe('Data Transformers', () => {
  describe('transformNetworkData', () => {
    it('should transform API network data to graph format', () => {
      const result = transformNetworkData(mockNetworkData);

      expect(result).toHaveProperty('nodes');
      expect(result).toHaveProperty('edges');
      expect(result.nodes).toHaveLength(5);
      expect(result.edges).toHaveLength(5);
    });

    it('should normalize centrality values to [0, 1]', () => {
      const result = transformNetworkData(mockNetworkData);

      result.nodes.forEach((node) => {
        expect(node.centrality).toBeGreaterThanOrEqual(0);
        expect(node.centrality).toBeLessThanOrEqual(1);
      });
    });

    it('should assign unique colors to communities', () => {
      const result = transformNetworkData(mockNetworkData);

      const communityColors = new Set(result.nodes.map((n) => n.color));
      expect(communityColors.size).toBeGreaterThan(0);
    });

    it('should throw when nodes array is missing', () => {
      expect(() => {
        transformNetworkData({ edges: [], communities: [] } as any);
      }).toThrow('nodes');
    });

    it('should throw when edges array is missing', () => {
      expect(() => {
        transformNetworkData({ nodes: [], communities: [] } as any);
      }).toThrow('edges');
    });

    it('should calculate node sizes based on centrality', () => {
      const result = transformNetworkData(mockNetworkData);

      // Higher centrality should mean larger size
      const alice = result.nodes.find((n) => n.name === 'Alice');
      const eve = result.nodes.find((n) => n.name === 'Eve');

      expect(alice).toBeDefined();
      expect(eve).toBeDefined();
      expect(alice!.size).toBeGreaterThan(eve!.size);
    });
  });

  describe('transformTimelineData', () => {
    it('should transform timeline data to stacked area format', () => {
      const result = transformTimelineData(mockTimelineData);

      expect(result).toHaveProperty('series');
      expect(result).toHaveProperty('innovations');
      expect(result.series).toHaveLength(3); // gather, craft, socialize
    });

    it('should align timestamps across all behaviors', () => {
      const result = transformTimelineData(mockTimelineData);

      const timestamps = result.series[0]!.data.map((d) => d.timestamp);
      result.series.forEach((series) => {
        const seriesTimestamps = series.data.map((d) => d.timestamp);
        expect(seriesTimestamps).toEqual(timestamps);
      });
    });

    it('should mark innovation events on timeline', () => {
      const result = transformTimelineData(mockTimelineData);

      expect(result.innovations).toHaveLength(2);
      expect(result.innovations[0]).toHaveProperty('timestamp');
      expect(result.innovations[0]).toHaveProperty('behavior');
      expect(result.innovations[0]).toHaveProperty('agent');
    });

    it('should throw when behaviors array is missing', () => {
      expect(() => {
        transformTimelineData({ innovations: [] } as any);
      }).toThrow('behaviors');
    });

    it('should handle empty behavior data gracefully', () => {
      expect(() => {
        transformTimelineData({ behaviors: [], innovations: [], adoptionCurves: {} });
      }).not.toThrow();
    });
  });

  describe('transformSpatialData', () => {
    it('should transform spatial data to heatmap format', () => {
      const result = transformSpatialData(mockSpatialData);

      expect(result).toHaveProperty('heatmap');
      expect(result).toHaveProperty('trails');
      expect(result).toHaveProperty('territories');
      expect(result).toHaveProperty('hotspots');
    });

    it('should normalize density values to [0, 1]', () => {
      const result = transformSpatialData(mockSpatialData);

      result.heatmap.forEach((point) => {
        expect(point.value).toBeGreaterThanOrEqual(0);
        expect(point.value).toBeLessThanOrEqual(1);
      });
    });

    it('should convert trails to drawable paths', () => {
      const result = transformSpatialData(mockSpatialData);

      expect(result.trails).toHaveLength(1);
      expect(result.trails[0]).toHaveProperty('agentId');
      expect(result.trails[0]).toHaveProperty('path');
      expect(result.trails[0]!.path).toHaveLength(3);
    });

    it('should throw when density array is missing', () => {
      expect(() => {
        transformSpatialData({ trails: [], territories: [], hotspots: [] } as any);
      }).toThrow('density');
    });

    it('should calculate bounding boxes for territories', () => {
      const result = transformSpatialData(mockSpatialData);

      result.territories.forEach((territory) => {
        expect(territory).toHaveProperty('bounds');
        expect(territory.bounds).toHaveProperty('minX');
        expect(territory.bounds).toHaveProperty('maxX');
        expect(territory.bounds).toHaveProperty('minY');
        expect(territory.bounds).toHaveProperty('maxY');
      });
    });
  });

  describe('transformInequalityData', () => {
    it('should transform inequality data to chart format', () => {
      const result = transformInequalityData(mockInequalityData);

      expect(result).toHaveProperty('lorenz');
      expect(result).toHaveProperty('gini');
      expect(result).toHaveProperty('quartiles');
      expect(result).toHaveProperty('mobility');
    });

    it('should include perfect equality line for Lorenz curve', () => {
      const result = transformInequalityData(mockInequalityData);

      expect(result.lorenz).toHaveProperty('actual');
      expect(result.lorenz).toHaveProperty('equality');
      expect(result.lorenz.equality).toHaveLength(result.lorenz.actual.length);
    });

    it('should calculate Gini coefficient from Lorenz curve', () => {
      const result = transformInequalityData(mockInequalityData);

      expect(result.gini.current).toBeGreaterThanOrEqual(0);
      expect(result.gini.current).toBeLessThanOrEqual(1);
    });

    it('should throw when lorenzCurve is missing', () => {
      expect(() => {
        transformInequalityData({ giniTrend: [], quartiles: {}, mobilityMatrix: [] } as any);
      }).toThrow('lorenzCurve');
    });

    it('should normalize mobility matrix rows to sum to 1', () => {
      const result = transformInequalityData(mockInequalityData);

      result.mobility.matrix.forEach((row) => {
        const sum = row.reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 5);
      });
    });

    it('should throw when mobility matrix is not square', () => {
      const invalidData = {
        ...mockInequalityData,
        mobilityMatrix: [
          [0.7, 0.3],
          [0.5, 0.5],
          [0.4, 0.6],
        ],
      };

      expect(() => {
        transformInequalityData(invalidData);
      }).toThrow('square matrix');
    });
  });

  describe('transformCulturalData', () => {
    it('should transform cultural diffusion data to visualization format', () => {
      const result = transformCulturalData(mockCulturalData);

      expect(result).toHaveProperty('sankey');
      expect(result).toHaveProperty('cascades');
      expect(result).toHaveProperty('adoption');
      expect(result).toHaveProperty('influencers');
    });

    it('should format Sankey data for D3-sankey', () => {
      const result = transformCulturalData(mockCulturalData);

      expect(result.sankey).toHaveProperty('nodes');
      expect(result.sankey).toHaveProperty('links');
      expect(result.sankey.nodes.length).toBeGreaterThan(0);
      expect(result.sankey.links.length).toBeGreaterThan(0);
    });

    it('should build cascade tree hierarchy', () => {
      const result = transformCulturalData(mockCulturalData);

      expect(result.cascades).toHaveLength(1);
      expect(result.cascades[0]).toHaveProperty('behavior');
      expect(result.cascades[0]).toHaveProperty('root');
      expect(result.cascades[0]).toHaveProperty('children');
    });

    it('should throw when sankeyData is missing', () => {
      expect(() => {
        transformCulturalData({ cascadeTrees: [], adoptionCurves: {}, influencers: [], transmissionRates: {} } as any);
      }).toThrow('sankeyData');
    });

    it('should rank influencers by spread count', () => {
      const result = transformCulturalData(mockCulturalData);

      expect(result.influencers).toHaveLength(2);
      expect(result.influencers[0]!.spreadCount).toBeGreaterThanOrEqual(result.influencers[1]!.spreadCount);
    });

    it('should calculate adoption rate from curve data', () => {
      const result = transformCulturalData(mockCulturalData);

      const craftCurve = result.adoption['craft'];
      expect(craftCurve).toBeDefined();
      craftCurve!.forEach((point) => {
        expect(point).toHaveProperty('rate');
      });
    });
  });

  describe('calculateCorrelation', () => {
    it('should calculate Pearson correlation coefficient', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10]; // Perfect positive correlation

      const r = calculateCorrelation(x, y);
      expect(r).toBeCloseTo(1.0, 5);
    });

    it('should handle negative correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2]; // Perfect negative correlation

      const r = calculateCorrelation(x, y);
      expect(r).toBeCloseTo(-1.0, 5);
    });

    it('should handle no correlation', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 3, 3, 3, 3]; // No variation

      const r = calculateCorrelation(x, y);
      expect(r).toBeNaN(); // Division by zero in stddev
    });

    it('should throw when arrays have different lengths', () => {
      const x = [1, 2, 3];
      const y = [1, 2, 3, 4];

      expect(() => {
        calculateCorrelation(x, y);
      }).toThrow('same length');
    });

    it('should throw when arrays are empty', () => {
      expect(() => {
        calculateCorrelation([], []);
      }).toThrow('empty');
    });

    it('should return value in range [-1, 1]', () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 3, 5, 4, 6];

      const r = calculateCorrelation(x, y);
      expect(r).toBeGreaterThanOrEqual(-1);
      expect(r).toBeLessThanOrEqual(1);
    });
  });
});
