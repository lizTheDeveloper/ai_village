/**
 * Mock data for testing metrics dashboard components
 * This file provides realistic test data matching the API responses
 */

export const mockNetworkData = {
  nodes: [
    { id: 'agent-001', name: 'Alice', centrality: 0.85, community: 1 },
    { id: 'agent-002', name: 'Bob', centrality: 0.62, community: 1 },
    { id: 'agent-003', name: 'Charlie', centrality: 0.45, community: 2 },
    { id: 'agent-004', name: 'Diana', centrality: 0.73, community: 2 },
    { id: 'agent-005', name: 'Eve', centrality: 0.38, community: 3 },
  ],
  edges: [
    { source: 'agent-001', target: 'agent-002', weight: 0.9 },
    { source: 'agent-001', target: 'agent-004', weight: 0.7 },
    { source: 'agent-002', target: 'agent-003', weight: 0.5 },
    { source: 'agent-003', target: 'agent-004', weight: 0.8 },
    { source: 'agent-004', target: 'agent-005', weight: 0.4 },
  ],
  communities: [
    { id: 1, size: 2, density: 0.9 },
    { id: 2, size: 2, density: 0.8 },
    { id: 3, size: 1, density: 1.0 },
  ],
};

export const mockTimelineData = {
  behaviors: [
    {
      name: 'gather',
      data: [
        { timestamp: 1000, count: 10 },
        { timestamp: 2000, count: 15 },
        { timestamp: 3000, count: 20 },
      ],
    },
    {
      name: 'craft',
      data: [
        { timestamp: 1000, count: 5 },
        { timestamp: 2000, count: 8 },
        { timestamp: 3000, count: 12 },
      ],
    },
    {
      name: 'socialize',
      data: [
        { timestamp: 1000, count: 8 },
        { timestamp: 2000, count: 12 },
        { timestamp: 3000, count: 18 },
      ],
    },
  ],
  innovations: [
    { timestamp: 1500, behavior: 'craft', agent: 'agent-001' },
    { timestamp: 2500, behavior: 'socialize', agent: 'agent-003' },
  ],
  adoptionCurves: {
    craft: [
      { timestamp: 1500, adopters: 1 },
      { timestamp: 2000, adopters: 3 },
      { timestamp: 2500, adopters: 7 },
      { timestamp: 3000, adopters: 12 },
    ],
  },
};

export const mockSpatialData = {
  density: [
    { x: 10, y: 20, value: 0.8 },
    { x: 15, y: 25, value: 0.9 },
    { x: 20, y: 30, value: 0.6 },
    { x: 25, y: 35, value: 0.4 },
  ],
  trails: [
    {
      agentId: 'agent-001',
      path: [
        { x: 10, y: 20, timestamp: 1000 },
        { x: 12, y: 22, timestamp: 1500 },
        { x: 15, y: 25, timestamp: 2000 },
      ],
    },
  ],
  territories: [
    {
      communityId: 1,
      boundary: [
        { x: 5, y: 15 },
        { x: 20, y: 15 },
        { x: 20, y: 30 },
        { x: 5, y: 30 },
      ],
    },
  ],
  hotspots: [
    { x: 15, y: 25, activity: 0.95, radius: 5 },
  ],
};

export const mockInequalityData = {
  lorenzCurve: [
    { population: 0, wealth: 0 },
    { population: 0.2, wealth: 0.05 },
    { population: 0.4, wealth: 0.15 },
    { population: 0.6, wealth: 0.35 },
    { population: 0.8, wealth: 0.65 },
    { population: 1.0, wealth: 1.0 },
  ],
  giniTrend: [
    { timestamp: 1000, gini: 0.3 },
    { timestamp: 2000, gini: 0.35 },
    { timestamp: 3000, gini: 0.42 },
  ],
  quartiles: {
    top25: { wealth: 5000, count: 25 },
    upper50: { wealth: 3000, count: 25 },
    lower50: { wealth: 1500, count: 25 },
    bottom25: { wealth: 500, count: 25 },
  },
  mobilityMatrix: [
    [0.7, 0.2, 0.08, 0.02], // Top 25% staying in each quartile
    [0.25, 0.5, 0.2, 0.05], // Upper 50%
    [0.1, 0.3, 0.5, 0.1],   // Lower 50%
    [0.05, 0.1, 0.3, 0.55], // Bottom 25%
  ],
};

export const mockCulturalData = {
  sankeyData: {
    nodes: [
      { id: 'agent-001', name: 'Alice' },
      { id: 'agent-002', name: 'Bob' },
      { id: 'agent-003', name: 'Charlie' },
    ],
    links: [
      { source: 'agent-001', target: 'agent-002', value: 5, behavior: 'craft' },
      { source: 'agent-001', target: 'agent-003', value: 3, behavior: 'craft' },
      { source: 'agent-002', target: 'agent-003', value: 2, behavior: 'socialize' },
    ],
  },
  cascadeTrees: [
    {
      behavior: 'craft',
      root: 'agent-001',
      children: [
        { agent: 'agent-002', timestamp: 1500, children: [] },
        { agent: 'agent-003', timestamp: 2000, children: [] },
      ],
    },
  ],
  adoptionCurves: {
    craft: [
      { timestamp: 1000, adopters: 1, rate: 0 },
      { timestamp: 1500, adopters: 3, rate: 0.4 },
      { timestamp: 2000, adopters: 7, rate: 0.8 },
      { timestamp: 2500, adopters: 10, rate: 0.6 },
      { timestamp: 3000, adopters: 12, rate: 0.4 },
    ],
  },
  influencers: [
    { agentId: 'agent-001', name: 'Alice', spreadCount: 8, behaviors: ['craft', 'socialize'] },
    { agentId: 'agent-002', name: 'Bob', spreadCount: 5, behaviors: ['craft'] },
  ],
  transmissionRates: {
    craft: 0.35,
    socialize: 0.42,
    gather: 0.28,
  },
};

export const mockTimeSeriesData = {
  metrics: [
    {
      name: 'average_mood',
      data: [
        { timestamp: 1000, value: 0.65 },
        { timestamp: 2000, value: 0.70 },
        { timestamp: 3000, value: 0.68 },
      ],
    },
    {
      name: 'resource_inequality',
      data: [
        { timestamp: 1000, value: 0.30 },
        { timestamp: 2000, value: 0.35 },
        { timestamp: 3000, value: 0.42 },
      ],
    },
  ],
  correlations: [
    ['average_mood', 'resource_inequality', -0.78],
    ['average_mood', 'social_connections', 0.65],
    ['resource_inequality', 'social_connections', -0.52],
  ],
  availableMetrics: [
    'average_mood',
    'resource_inequality',
    'social_connections',
    'innovation_rate',
    'territory_size',
  ],
};

export const mockWebSocketMessage = {
  type: 'metrics_update',
  data: {
    timestamp: Date.now(),
    metrics: {
      agentCount: 100,
      averageMood: 0.72,
      gini: 0.38,
    },
  },
};

export const mockAgentDetails = {
  id: 'agent-001',
  name: 'Alice',
  centrality: 0.85,
  community: 1,
  connections: ['agent-002', 'agent-004'],
  behaviors: ['gather', 'craft', 'socialize'],
  wealth: 5000,
  position: { x: 15, y: 25 },
  innovationCount: 3,
};
