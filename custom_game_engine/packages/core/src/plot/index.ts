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
  PlotConditionContext,
  PlotEffect,
  PlotEffectContext,
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

// Plot Line Registry
export {
  plotLineRegistry,
  registerPlotTemplate,
  getPlotTemplate,
  instantiatePlot,
} from './PlotLineRegistry.js';

// Plot Templates
export {
  momentOfCourage,
  firstConversation,
  ascensionThroughSurrender,
  POC_PLOT_TEMPLATES,
  ALL_PLOT_TEMPLATES,
  initializePlotTemplates,
} from './PlotTemplates.js';

// Plot Condition Evaluator (Phase 1)
export {
  evaluateCondition,
  evaluateTransitionConditions,
  createConditionContext,
} from './PlotConditionEvaluator.js';

// Plot Effect Executor (Phase 1)
export {
  executeEffect,
  executeEffects,
  createEffectContext,
  captureRelationshipSnapshot,
  captureAllRelationshipSnapshots,
} from './PlotEffectExecutor.js';
