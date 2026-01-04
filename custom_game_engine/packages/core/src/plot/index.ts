/**
 * Plot System Exports
 *
 * Lesson-driven narrative system with multi-scale plots from micro moments
 * to multi-lifetime epics.
 */

// Plot Types
export type {
  PlotScale,
  PlotStatus,
  PlotForkBehavior,
  PlotLesson,
  PlotCondition,
  PlotEffect,
  PlotTransition,
  PlotStage,
  PlotLineTemplate,
  PlotLineInstance,
  CompletedPlot,
  AbandonedPlot,
  PlotLinesComponent,
} from './PlotTypes.js';
export {
  createPlotLinesComponent,
  addActivePlot,
  completePlot,
  abandonPlot,
  getActivePlotsByScale,
  hasLearnedPlotLesson,
} from './PlotTypes.js';
