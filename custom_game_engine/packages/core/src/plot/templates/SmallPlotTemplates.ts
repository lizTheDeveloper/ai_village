/**
 * Small Plot Templates - Short arcs of growth
 *
 * Duration: Days to weeks
 * Active per soul: 1-5
 * Lesson value: 2-5 wisdom
 *
 * These are brief storylines that develop over multiple interactions.
 *
 * Plot templates are now loaded from JSON data files to separate
 * narrative content from code structure.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';
import plotTemplatesData from '../../data/plot-templates.json';

/**
 * Load and validate plot templates from JSON
 */
function loadPlotTemplates(): PlotLineTemplate[] {
  const templates = plotTemplatesData.small_plot_templates as PlotLineTemplate[];

  if (!templates || !Array.isArray(templates)) {
    throw new Error('[SmallPlotTemplates] Failed to load plot templates from JSON');
  }

  // Validate each template has required fields
  for (const template of templates) {
    if (!template.id || !template.name || !template.scale || !template.stages || !template.transitions) {
      throw new Error(`[SmallPlotTemplates] Invalid template structure: ${template.id || 'unknown'}`);
    }
  }

  return templates;
}

// Load templates from JSON
const LOADED_TEMPLATES = loadPlotTemplates();

// Create a map for easy lookup by ID
const TEMPLATE_MAP = new Map<string, PlotLineTemplate>(
  LOADED_TEMPLATES.map(t => [t.id, t])
);

// =============================================================================
// EXPORTED TEMPLATE CONSTANTS (for backwards compatibility)
// =============================================================================

export const firstFriendship: PlotLineTemplate = TEMPLATE_MAP.get('small_first_friendship')!;
export const healingRift: PlotLineTemplate = TEMPLATE_MAP.get('small_healing_rift')!;
export const learningNewSkill: PlotLineTemplate = TEMPLATE_MAP.get('small_learning_skill')!;
export const findingMentor: PlotLineTemplate = TEMPLATE_MAP.get('small_finding_mentor')!;
export const overcomingFear: PlotLineTemplate = TEMPLATE_MAP.get('small_overcoming_fear')!;
export const processingGrief: PlotLineTemplate = TEMPLATE_MAP.get('small_processing_grief')!;
export const findingPurpose: PlotLineTemplate = TEMPLATE_MAP.get('small_finding_purpose')!;
export const settingPersonalGoal: PlotLineTemplate = TEMPLATE_MAP.get('small_personal_goal')!;
export const standingUpForSelf: PlotLineTemplate = TEMPLATE_MAP.get('small_standing_up')!;
export const makingAmends: PlotLineTemplate = TEMPLATE_MAP.get('small_making_amends')!;
export const adaptingToChange: PlotLineTemplate = TEMPLATE_MAP.get('small_adapting_change')!;
export const breakingHabit: PlotLineTemplate = TEMPLATE_MAP.get('small_breaking_habit')!;
export const openingUp: PlotLineTemplate = TEMPLATE_MAP.get('small_opening_up')!;
export const trustingAgain: PlotLineTemplate = TEMPLATE_MAP.get('small_trusting_again')!;
export const findingBelonging: PlotLineTemplate = TEMPLATE_MAP.get('small_finding_belonging')!;
export const helpingStranger: PlotLineTemplate = TEMPLATE_MAP.get('small_helping_stranger')!;

// =============================================================================
// EXPORT ALL SMALL TEMPLATES
// =============================================================================

export const SMALL_PLOT_TEMPLATES: PlotLineTemplate[] = LOADED_TEMPLATES;

// Total: 16 small templates (loaded from JSON)
