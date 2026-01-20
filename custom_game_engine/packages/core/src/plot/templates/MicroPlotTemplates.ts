/**
 * Micro Plot Templates - Fleeting moments of growth
 *
 * Duration: Minutes to hours
 * Active per soul: 5-20
 * Lesson value: 1-2 wisdom
 *
 * These are brief opportunities that arise from immediate circumstances.
 *
 * Plot templates are now loaded from JSON data files to separate
 * narrative content from code structure.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';
import plotTemplatesData from '../../../data/plot-templates.json';

/**
 * Load and validate micro plot templates from JSON
 */
function loadMicroPlotTemplates(): PlotLineTemplate[] {
  const templates = plotTemplatesData.micro_plot_templates as PlotLineTemplate[];

  if (!templates || !Array.isArray(templates)) {
    throw new Error('[MicroPlotTemplates] Failed to load micro plot templates from JSON');
  }

  // Validate each template has required fields
  for (const template of templates) {
    if (!template.id || !template.name || !template.scale || !template.stages || !template.transitions) {
      throw new Error(`[MicroPlotTemplates] Invalid template structure: ${template.id || 'unknown'}`);
    }
    if (template.scale !== 'micro') {
      throw new Error(`[MicroPlotTemplates] Template ${template.id} has wrong scale: ${template.scale}`);
    }
  }

  return templates;
}

/**
 * All micro plot templates loaded from JSON
 */
export const MICRO_PLOT_TEMPLATES: PlotLineTemplate[] = loadMicroPlotTemplates();

// Legacy named exports for backward compatibility
export const momentOfCourage = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_moment_of_courage')!;
export const facingTheUnknown = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_facing_unknown')!;
export const actOfKindness = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_act_of_kindness')!;
export const offeringComfort = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_offering_comfort')!;
export const biteYourTongue = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_bite_tongue')!;
export const waitingPatiently = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_waiting_patiently')!;
export const tellingTheTruth = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_telling_truth')!;
export const admittingMistake = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_admitting_mistake')!;
export const momentOfGratitude = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_gratitude')!;
export const thankingSomeone = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_thanking')!;
export const lettingGoAnger = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_letting_go_anger')!;
export const acceptingLoss = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_accepting_loss')!;
export const followingCuriosity = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_following_curiosity')!;
export const askingQuestion = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_asking_question')!;
export const takingABreak = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_taking_break')!;
export const settingBoundary = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_setting_boundary')!;
export const celebratingSuccess = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_celebrating_success')!;
export const sharingJoy = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_sharing_joy')!;
export const smallForgiveness = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_small_forgiveness')!;
export const choosingPeace = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_choosing_peace')!;
export const momentOfClarity = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_moment_clarity')!;

// Polti's 36 Dramatic Situations (Phase 1 expansion)
export const remorse = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_remorse')!;
export const sacrificeForPassion = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_sacrifice_for_passion')!;
export const daringEnterprise = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_daring_enterprise')!;
export const disaster = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_disaster')!;
export const revolt = MICRO_PLOT_TEMPLATES.find(t => t.id === 'micro_revolt')!;
