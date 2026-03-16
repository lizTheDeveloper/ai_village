/**
 * PlotComponent - stub component for plot/story tracking
 */

export type PlotType =
  | 'invasion'
  | 'paradox_resolution'
  | 'timeline_merger'
  | 'causal_crisis'
  | 'cosmic_event';

export type PlotStatus = 'proposed' | 'active' | 'completed' | 'failed' | 'abandoned';

export interface PlotObjective {
  id: string;
  description: string;
  completed: boolean;
  requiredBy?: number;
}

export interface PlotComponent {
  type: 'plot';
  version: 1;
  id: string;
  plotType: PlotType;
  status: PlotStatus;
  universeId: string;
  title: string;
  description: string;
  objectives: PlotObjective[];
  assignedAgents: string[];
  startTick: number;
  endTick?: number;
  priority: number;
}

export function createPlotComponent(
  id: string,
  plotType: PlotType,
  universeId: string,
  title: string,
  description: string
): PlotComponent {
  return {
    type: 'plot',
    version: 1,
    id,
    plotType,
    status: 'proposed',
    universeId,
    title,
    description,
    objectives: [],
    assignedAgents: [],
    startTick: 0,
    priority: 1,
  };
}
