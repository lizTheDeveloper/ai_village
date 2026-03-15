/**
 * Data transformation utilities for metrics dashboard
 */

export function transformNetworkData(apiData: any) {
  if (!apiData || !apiData.nodes) {
    throw new Error('Invalid network data: missing nodes');
  }
  if (!apiData.edges) {
    throw new Error('Invalid network data: missing edges');
  }

  const maxCentrality = Math.max(...apiData.nodes.map((n: any) => n.centrality), 1e-10);

  // Simple deterministic color palette per community
  const communityColorMap = new Map<number, string>();
  const palette = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
    '#1abc9c', '#e67e22', '#34495e', '#e91e63', '#00bcd4',
  ];
  let colorIndex = 0;

  const nodes = apiData.nodes.map((node: any) => {
    if (!communityColorMap.has(node.community)) {
      communityColorMap.set(node.community, palette[colorIndex % palette.length]!);
      colorIndex++;
    }
    const normalizedCentrality = node.centrality / maxCentrality;
    return {
      ...node,
      centrality: normalizedCentrality,
      color: communityColorMap.get(node.community)!,
      size: 10 + normalizedCentrality * 40,
    };
  });

  return {
    ...apiData,
    nodes,
  };
}

export function transformTimelineData(apiData: any) {
  if (!apiData || !apiData.behaviors) {
    throw new Error('Invalid timeline data: missing behaviors');
  }

  return {
    series: apiData.behaviors,
    innovations: apiData.innovations || [],
  };
}

export function transformSpatialData(apiData: any) {
  if (!apiData || !apiData.density) {
    throw new Error('Invalid spatial data: missing density');
  }

  const maxDensity = Math.max(...apiData.density.map((d: any) => d.value), 1e-10);
  const heatmap = apiData.density.map((point: any) => ({
    ...point,
    value: point.value / maxDensity,
  }));

  const territories = (apiData.territories || []).map((territory: any) => {
    const boundary: Array<{ x: number; y: number }> = territory.boundary || [];
    const xs = boundary.map((p: any) => p.x);
    const ys = boundary.map((p: any) => p.y);
    const bounds = {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
    return { ...territory, bounds };
  });

  return {
    heatmap,
    trails: apiData.trails || [],
    territories,
    hotspots: apiData.hotspots || [],
  };
}

export function transformInequalityData(apiData: any) {
  if (!apiData || !apiData.lorenzCurve) {
    throw new Error('Invalid inequality data: missing lorenzCurve');
  }

  const matrix: number[][] = apiData.mobilityMatrix || [];
  for (const row of matrix) {
    if (row.length !== matrix.length) {
      throw new Error('Invalid inequality data: mobilityMatrix must be a square matrix');
    }
  }

  // Build equality (45-degree) line using the same population values
  const actual = apiData.lorenzCurve;
  const equality = actual.map((point: any) => ({
    population: point.population,
    wealth: point.population,
  }));

  // Gini coefficient: ratio of area between equality line and Lorenz curve
  // Using trapezoidal integration for both areas under the curves
  let areaUnderEquality = 0;
  let areaUnderLorenz = 0;
  for (let i = 1; i < actual.length; i++) {
    const dx = actual[i].population - actual[i - 1].population;
    areaUnderEquality += dx * (actual[i - 1].population + actual[i].population) / 2;
    areaUnderLorenz += dx * (actual[i - 1].wealth + actual[i].wealth) / 2;
  }
  const giniCurrent = areaUnderEquality > 0
    ? (areaUnderEquality - areaUnderLorenz) / areaUnderEquality
    : 0;

  // Normalize mobility matrix rows to sum to 1
  const normalizedMatrix = matrix.map((row: number[]) => {
    const rowSum = row.reduce((a, b) => a + b, 0);
    if (rowSum === 0) return row.map(() => 0);
    return row.map((v) => v / rowSum);
  });

  return {
    lorenz: { actual, equality },
    gini: { current: Math.max(0, Math.min(1, giniCurrent)) },
    quartiles: apiData.quartiles,
    mobility: { matrix: normalizedMatrix },
  };
}

export function transformCulturalData(apiData: any) {
  if (!apiData || !apiData.sankeyData) {
    throw new Error('Invalid cultural data: missing sankeyData');
  }

  const influencers = [...(apiData.influencers || [])].sort(
    (a: any, b: any) => b.spreadCount - a.spreadCount,
  );

  return {
    sankey: apiData.sankeyData,
    cascades: apiData.cascadeTrees || [],
    adoption: apiData.adoptionCurves || {},
    influencers,
  };
}

export function transformTimeSeriesData(apiData: any) {
  if (!apiData || !apiData.metrics) {
    throw new Error('Invalid time series data format');
  }
  return apiData;
}

export function calculateCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length) {
    throw new Error('Arrays must have the same length');
  }
  const n = x.length;
  if (n === 0) {
    throw new Error('Arrays must not be empty');
  }

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i]!, 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return NaN;

  return numerator / denominator;
}
