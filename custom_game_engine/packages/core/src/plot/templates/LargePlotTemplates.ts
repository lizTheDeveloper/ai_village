/**
 * Large Plot Templates - Epic life narratives
 *
 * Duration: Years to decades
 * Active per soul: 0-1
 * Lesson value: 15-50 wisdom
 *
 * These are defining arcs that span most or all of a soul's incarnation.
 *
 * Plot templates are now loaded from JSON data files to separate
 * narrative content from code structure.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';
import plotTemplatesData from '../../../data/plot-templates.json';

/**
 * Load and validate large plot templates from JSON
 */
function loadLargePlotTemplates(): PlotLineTemplate[] {
  const templates = plotTemplatesData.large_plot_templates as PlotLineTemplate[];

  if (!templates || !Array.isArray(templates)) {
    throw new Error('[LargePlotTemplates] Failed to load large plot templates from JSON');
  }

  // Validate each template has required fields
  for (const template of templates) {
    if (!template.id || !template.name || !template.scale || !template.stages || !template.transitions) {
      throw new Error(`[LargePlotTemplates] Invalid template structure: ${template.id || 'unknown'}`);
    }
    if (template.scale !== 'large') {
      throw new Error(`[LargePlotTemplates] Template ${template.id} has wrong scale: ${template.scale}`);
    }
  }

  return templates;
}

/**
 * All large plot templates loaded from JSON
 */
export const LARGE_PLOT_TEMPLATES: PlotLineTemplate[] = loadLargePlotTemplates();

// Legacy named exports for backward compatibility
export const herosJourney = LARGE_PLOT_TEMPLATES.find(t => t.id === 'large_heros_journey')!;
export const findingLifePurpose = LARGE_PLOT_TEMPLATES.find(t => t.id === 'large_life_purpose')!;
export const lifelongLove = LARGE_PLOT_TEMPLATES.find(t => t.id === 'large_lifelong_love')!;
export const buildingALegacy = LARGE_PLOT_TEMPLATES.find(t => t.id === 'large_building_legacy')!;
export const spiritualAwakening = LARGE_PLOT_TEMPLATES.find(t => t.id === 'large_spiritual_awakening')!;
export const becomingMentor = LARGE_PLOT_TEMPLATES.find(t => t.id === 'large_becoming_mentor')!;
