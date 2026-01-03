import { create } from 'zustand';

export interface NetworkData {
  nodes: Array<{
    id: string;
    name: string;
    centrality: number;
    community: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
  }>;
  communities: Array<{
    id: number;
    size: number;
    density: number;
  }>;
}

export interface TimelineData {
  behaviors: Array<{
    name: string;
    data: Array<{
      timestamp: number;
      count: number;
    }>;
  }>;
  innovations: Array<{
    timestamp: number;
    behavior: string;
    agent: string;
  }>;
  adoptionCurves: Record<string, Array<{
    timestamp: number;
    adopters: number;
  }>>;
}

export interface SpatialData {
  density: Array<{
    x: number;
    y: number;
    value: number;
  }>;
  trails: Array<{
    agentId: string;
    path: Array<{
      x: number;
      y: number;
      timestamp: number;
    }>;
  }>;
  territories: Array<{
    communityId: number;
    boundary: Array<{
      x: number;
      y: number;
    }>;
  }>;
  hotspots: Array<{
    x: number;
    y: number;
    activity: number;
    radius: number;
  }>;
}

export interface InequalityData {
  lorenzCurve: Array<{
    population: number;
    wealth: number;
  }>;
  giniTrend: Array<{
    timestamp: number;
    gini: number;
  }>;
  quartiles: {
    top25: { wealth: number; count: number };
    upper50: { wealth: number; count: number };
    lower50: { wealth: number; count: number };
    bottom25: { wealth: number; count: number };
  };
  mobilityMatrix: number[][];
}

export interface CulturalData {
  sankeyData: {
    nodes: Array<{
      id: string;
      name: string;
    }>;
    links: Array<{
      source: string;
      target: string;
      value: number;
      behavior: string;
    }>;
  };
  cascadeTrees: Array<{
    behavior: string;
    root: string;
    children: Array<any>;
  }>;
  adoptionCurves: Record<string, Array<{
    timestamp: number;
    adopters: number;
    rate: number;
  }>>;
  influencers: Array<{
    agentId: string;
    name: string;
    spreadCount: number;
    behaviors: string[];
  }>;
  transmissionRates: Record<string, number>;
}

export interface TimeSeriesData {
  metrics: Array<{
    name: string;
    data: Array<{
      timestamp: number;
      value: number;
    }>;
  }>;
  correlations: Array<[string, string, number]>;
  availableMetrics: string[];
}

export interface AgentDetails {
  id: string;
  name: string;
  centrality: number;
  community: number;
  connections: string[];
  behaviors: string[];
  wealth: number;
  position: { x: number; y: number };
  innovationCount: number;
}

interface MetricsState {
  networkData: NetworkData | null;
  timelineData: TimelineData | null;
  spatialData: SpatialData | null;
  inequalityData: InequalityData | null;
  culturalData: CulturalData | null;
  timeSeriesData: TimeSeriesData | null;
  selectedAgent: AgentDetails | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;

  setNetworkData: (data: NetworkData | null) => void;
  setTimelineData: (data: TimelineData | null) => void;
  setSpatialData: (data: SpatialData | null) => void;
  setInequalityData: (data: InequalityData | null) => void;
  setCulturalData: (data: CulturalData | null) => void;
  setTimeSeriesData: (data: TimeSeriesData | null) => void;
  setSelectedAgent: (agent: AgentDetails | null) => void;
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  networkData: null,
  timelineData: null,
  spatialData: null,
  inequalityData: null,
  culturalData: null,
  timeSeriesData: null,
  selectedAgent: null,
  isConnected: false,
  isLoading: false,
  error: null,

  setNetworkData: (data) => set({ networkData: data }),
  setTimelineData: (data) => set({ timelineData: data }),
  setSpatialData: (data) => set({ spatialData: data }),
  setInequalityData: (data) => set({ inequalityData: data }),
  setCulturalData: (data) => set({ culturalData: data }),
  setTimeSeriesData: (data) => set({ timeSeriesData: data }),
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),
  setConnected: (connected) => set({ isConnected: connected }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
