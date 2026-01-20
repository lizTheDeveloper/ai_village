/**
 * Epic Plot Templates - Multi-lifetime ascension paths
 *
 * Duration: Multiple lifetimes (years to centuries)
 * Active per soul: 0-1
 * Lesson value: 50-200+ wisdom
 *
 * These are transcendent journeys that span multiple incarnations,
 * leading souls toward divine transformation or higher states of being.
 * Based on various mythological and religious ascension traditions:
 *
 * - The Endless Summer: Fae/Fairy ascension through nature, joy, and wild magic
 * - The Enochian Ascension: Angelic path through purity, divine service, and celestial law
 * - The Exaltation Path: Mormon-inspired progression toward godhood through family and creation
 *
 * Epic plots are NOT auto-assigned by triggers. They are assigned by
 * the divinity system, soul progression mechanics, or special trigger
 * events when a soul demonstrates exceptional wisdom and meets specific
 * criteria for transcendence.
 *
 * Plot templates are loaded from JSON data files to separate
 * narrative content from code structure.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';
import plotTemplatesData from '../../../data/plot-templates.json';

/**
 * Load and validate epic ascension plot templates from JSON
 */
function loadEpicPlotTemplates(): PlotLineTemplate[] {
  const templates = plotTemplatesData.epic_ascension_templates as PlotLineTemplate[];

  if (!templates || !Array.isArray(templates)) {
    throw new Error('[EpicPlotTemplates] Failed to load epic ascension templates from JSON');
  }

  // Validate each template has required fields
  for (const template of templates) {
    if (!template.id || !template.name || !template.scale || !template.stages || !template.transitions) {
      throw new Error(`[EpicPlotTemplates] Invalid template structure: ${template.id || 'unknown'}`);
    }
    if (template.scale !== 'epic') {
      throw new Error(`[EpicPlotTemplates] Template ${template.id} has wrong scale: ${template.scale}`);
    }
  }

  return templates;
}

/**
 * All epic ascension plot templates loaded from JSON
 */
export const EPIC_PLOT_TEMPLATES: PlotLineTemplate[] = loadEpicPlotTemplates();

// Named exports for backward compatibility and direct access
export const endlessSummer = EPIC_PLOT_TEMPLATES.find(t => t.id === 'epic_endless_summer')!;
export const enochianAscension = EPIC_PLOT_TEMPLATES.find(t => t.id === 'epic_enochian_ascension')!;
export const exaltationPath = EPIC_PLOT_TEMPLATES.find(t => t.id === 'epic_exaltation_path')!;
