/**
 * Medium Plot Templates - Significant life arcs
 *
 * Duration: Months to years
 * Active per soul: 0-2
 * Lesson value: 5-15 wisdom
 *
 * These are substantial storylines that shape character over extended periods.
 *
 * Plot templates are now loaded from JSON data files to separate
 * narrative content from code structure.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';
import plotTemplatesData from '../../../data/plot-templates.json';

/**
 * Load and validate medium plot templates from JSON
 */
function loadMediumPlotTemplates(): PlotLineTemplate[] {
  const templates = plotTemplatesData.medium_plot_templates as PlotLineTemplate[];

  if (!templates || !Array.isArray(templates)) {
    throw new Error('[MediumPlotTemplates] Failed to load medium plot templates from JSON');
  }

  // Validate each template has required fields
  for (const template of templates) {
    if (!template.id || !template.name || !template.scale || !template.stages || !template.transitions) {
      throw new Error(`[MediumPlotTemplates] Invalid template structure: ${template.id || 'unknown'}`);
    }
    if (template.scale !== 'medium') {
      throw new Error(`[MediumPlotTemplates] Template ${template.id} has wrong scale: ${template.scale}`);
    }
  }

  return templates;
}

/**
 * All medium plot templates loaded from JSON
 */
export const MEDIUM_PLOT_TEMPLATES: PlotLineTemplate[] = loadMediumPlotTemplates();

// Legacy named exports for backward compatibility
export const masteringCraft = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_mastering_craft')!;
export const buildingSomethingGreat = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_building_great')!;
export const deepPartnership = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_deep_partnership')!;
export const raisingChild = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_raising_child')!;
export const becomingLeader = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_becoming_leader')!;
export const healingFromTrauma = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_healing_trauma')!;
export const redemptionArc = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_redemption')!;
export const discoveryOfTruth = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_discovery_truth')!;
export const findinFaith = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_finding_faith')!;
export const losingEverything = MEDIUM_PLOT_TEMPLATES.find(t => t.id === 'medium_losing_everything')!;
