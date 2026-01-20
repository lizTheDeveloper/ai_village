/**
 * Exotic Plot Templates - Rare system-driven narratives
 *
 * Duration: Months to years
 * Active per soul: 0-2
 * Lesson value: 5-25 wisdom
 *
 * These are unusual plots that require special system integration:
 * - Divine relationships and conflicts
 * - Multiverse/background universe invasions
 * - Magic paradigm conflicts
 * - Dimensional horrors from β-space
 * - Political power and corruption
 * - Time paradoxes and timeline manipulation
 *
 * Exotic plots are NOT auto-assigned by triggers. They are assigned
 * manually by game systems (divinity, multiverse, magic, etc.) when
 * appropriate conditions are met.
 *
 * Plot templates are loaded from JSON data files to separate
 * narrative content from code structure.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';
import plotTemplatesData from '../../../data/plot-templates.json';

/**
 * Load and validate exotic plot templates from JSON
 */
function loadExoticPlotTemplates(): PlotLineTemplate[] {
  const templates = plotTemplatesData.exotic_plot_templates as PlotLineTemplate[];

  if (!templates || !Array.isArray(templates)) {
    throw new Error('[ExoticPlotTemplates] Failed to load exotic plot templates from JSON');
  }

  // Validate each template has required fields
  for (const template of templates) {
    if (!template.id || !template.name || !template.scale || !template.stages || !template.transitions) {
      throw new Error(`[ExoticPlotTemplates] Invalid template structure: ${template.id || 'unknown'}`);
    }
    // Exotic templates use 'large' scale but have special system integration requirements
    if (template.scale !== 'large') {
      throw new Error(`[ExoticPlotTemplates] Template ${template.id} has wrong scale: ${template.scale} (expected 'large')`);
    }
  }

  return templates;
}

/**
 * All exotic plot templates loaded from JSON
 */
export const EXOTIC_PLOT_TEMPLATES: PlotLineTemplate[] = loadExoticPlotTemplates();

// Named exports for backward compatibility and direct access
export const divineReckoning = EXOTIC_PLOT_TEMPLATES.find(t => t.id === 'exotic_divine_reckoning')!;
export const prophecyTrap = EXOTIC_PLOT_TEMPLATES.find(t => t.id === 'exotic_prophecy_trap')!;
export const fromBeyondTheVeil = EXOTIC_PLOT_TEMPLATES.find(t => t.id === 'exotic_from_beyond_veil')!;
export const whenMagicsCollide = EXOTIC_PLOT_TEMPLATES.find(t => t.id === 'exotic_when_magics_collide')!;
export const tyrantYouBecame = EXOTIC_PLOT_TEMPLATES.find(t => t.id === 'exotic_tyrant_you_became')!;
export const whatDwellsBetween = EXOTIC_PLOT_TEMPLATES.find(t => t.id === 'exotic_what_dwells_between')!;
export const priceOfChangingYesterday = EXOTIC_PLOT_TEMPLATES.find(t => t.id === 'exotic_price_changing_yesterday')!;
export const burdenOfBeingChosen = EXOTIC_PLOT_TEMPLATES.find(t => t.id === 'exotic_burden_being_chosen')!;
