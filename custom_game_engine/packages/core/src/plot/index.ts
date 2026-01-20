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
  // Phase 2: Event-Driven Triggers
  PlotTrigger,
  TriggerAgentBinding,
  PlotTriggerEvent,
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

// Scale-specific template collections
export { MICRO_PLOT_TEMPLATES } from './templates/MicroPlotTemplates.js';
export { SMALL_PLOT_TEMPLATES } from './templates/SmallPlotTemplates.js';
export { MEDIUM_PLOT_TEMPLATES } from './templates/MediumPlotTemplates.js';
export { LARGE_PLOT_TEMPLATES } from './templates/LargePlotTemplates.js';
export { EXOTIC_PLOT_TEMPLATES } from './templates/ExoticPlotTemplates.js';
export { EPIC_PLOT_TEMPLATES } from './templates/EpicPlotTemplates.js';
export { ISEKAI_PLOT_TEMPLATES } from './templates/IsekaiPlotTemplates.js';

// Plot Condition Evaluator (Phase 1)
export {
  evaluatePlotCondition,
  evaluatePlotTransitionConditions,
  createPlotConditionContext,
} from './PlotConditionEvaluator.js';

// Plot Effect Executor (Phase 1)
export {
  executeEffect,
  executeEffects,
  createEffectContext,
  captureRelationshipSnapshot,
  captureAllRelationshipSnapshots,
} from './PlotEffectExecutor.js';

// Event-Driven Plot Assignment (Phase 2)
export {
  EventDrivenPlotAssignmentSystem,
  createPlotTriggerEvent,
  templateHasTriggers,
  getTriggeredTemplates,
} from './EventDrivenPlotAssignment.js';

// Fates Council - Exotic & Epic Plot Assignment
export {
  FatesCouncilSystem,
  type EntityThread,
  type ExoticEvent,
  type StoryHook,
  type FatesCouncilContext,
  type FatesDecision,
} from './FatesCouncilSystem.js';
