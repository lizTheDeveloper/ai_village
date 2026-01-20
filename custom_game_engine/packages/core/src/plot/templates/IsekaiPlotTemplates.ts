/**
 * Isekai Plot Templates - Cross-multiverse narratives
 *
 * Duration: Months to years
 * Active per soul: 0-1
 * Lesson value: 20-28 wisdom
 * Multiverse scope: cross_multiverse
 *
 * These are isekai (other-world) plots involving souls traveling between universes:
 * - Summoned heroes fulfilling prophecies in foreign universes
 * - Dimensional refugees fleeing dying realities
 * - Multiversal diplomats preventing inter-universe wars
 * - Convergence events where alternate selves meet
 *
 * Isekai plots are NOT auto-assigned by triggers. They are assigned
 * manually by multiverse systems when cross-universe travel is required
 * or enabled by the narrative.
 *
 * All isekai templates have multiverse_scope: 'cross_multiverse' set in
 * their metadata to identify them as cross-universe storylines.
 *
 * Plot templates are loaded from JSON data files to separate
 * narrative content from code structure.
 */

import type { PlotLineTemplate } from '../PlotTypes.js';
import isekaiTemplatesData from '../../../data/isekai-plot-templates.json';

/**
 * Load and validate isekai plot templates from JSON
 */
function loadIsekaiPlotTemplates(): PlotLineTemplate[] {
  const templates = isekaiTemplatesData as PlotLineTemplate[];

  if (!templates || !Array.isArray(templates)) {
    throw new Error('[IsekaiPlotTemplates] Failed to load isekai plot templates from JSON');
  }

  // Validate each template has required fields
  for (const template of templates) {
    if (!template.id || !template.name || !template.scale || !template.stages || !template.transitions) {
      throw new Error(`[IsekaiPlotTemplates] Invalid template structure: ${template.id || 'unknown'}`);
    }

    // Isekai templates use 'exotic' scale for significant cross-universe events
    if (template.scale !== 'exotic') {
      throw new Error(`[IsekaiPlotTemplates] Template ${template.id} has wrong scale: ${template.scale} (expected 'exotic')`);
    }

    // Verify multiverse_scope is set
    const templateWithScope = template as PlotLineTemplate & { multiverse_scope?: string };
    if (templateWithScope.multiverse_scope !== 'cross_multiverse') {
      console.warn(`[IsekaiPlotTemplates] Template ${template.id} missing multiverse_scope: 'cross_multiverse'`);
    }
  }

  return templates;
}

/**
 * All isekai plot templates loaded from JSON
 */
export const ISEKAI_PLOT_TEMPLATES: PlotLineTemplate[] = loadIsekaiPlotTemplates();

// Named exports for backward compatibility and direct access
export const summonedHero = ISEKAI_PLOT_TEMPLATES.find(t => t.id === 'isekai_summoned_hero')!;
export const dimensionalRefugee = ISEKAI_PLOT_TEMPLATES.find(t => t.id === 'isekai_dimensional_refugee')!;
export const multiversalDiplomat = ISEKAI_PLOT_TEMPLATES.find(t => t.id === 'isekai_multiversal_diplomat')!;
export const convergence = ISEKAI_PLOT_TEMPLATES.find(t => t.id === 'isekai_convergence')!;
