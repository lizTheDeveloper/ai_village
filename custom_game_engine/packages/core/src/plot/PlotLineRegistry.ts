/**
 * PlotLineRegistry - Central storage for plot line templates
 *
 * Manages the collection of reusable plot templates and handles
 * instantiation of plots for specific souls.
 */

import type {
  PlotLineTemplate,
  PlotLineInstance,
  PlotScale,
} from './PlotTypes.js';

/**
 * Global registry of plot line templates
 */
class PlotLineRegistry {
  private templates: Map<string, PlotLineTemplate> = new Map();

  /**
   * Register a plot line template
   */
  register(template: PlotLineTemplate): void {
    if (this.templates.has(template.id)) {
      console.warn(`[PlotRegistry] Template ${template.id} already registered, overwriting`);
    }
    this.templates.set(template.id, template);
  }

  /**
   * Register multiple templates at once
   */
  registerMany(templates: PlotLineTemplate[]): void {
    for (const template of templates) {
      this.register(template);
    }
  }

  /**
   * Get a template by ID
   */
  getTemplate(template_id: string): PlotLineTemplate | undefined {
    return this.templates.get(template_id);
  }

  /**
   * Check if a template exists
   */
  hasTemplate(template_id: string): boolean {
    return this.templates.has(template_id);
  }

  /**
   * Get all templates
   */
  getAllTemplates(): PlotLineTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by scale
   */
  getTemplatesByScale(scale: PlotScale): PlotLineTemplate[] {
    return Array.from(this.templates.values()).filter(t => t.scale === scale);
  }

  /**
   * Get templates that match assignment criteria
   */
  getEligibleTemplates(criteria: {
    wisdom?: number;
    archetype?: string;
    interests?: string[];
    learned_lessons?: string[];
  }): PlotLineTemplate[] {
    return Array.from(this.templates.values()).filter(template => {
      const rules = template.assignment_rules;
      if (!rules) return true;

      // Check wisdom requirement
      if (rules.min_wisdom && criteria.wisdom !== undefined && criteria.wisdom < rules.min_wisdom) {
        return false;
      }

      // Check archetype requirement
      if (rules.required_archetype && criteria.archetype) {
        if (!rules.required_archetype.includes(criteria.archetype)) {
          return false;
        }
      }

      // Check interest requirements
      if (rules.required_interests && criteria.interests) {
        const hasRequiredInterest = rules.required_interests.some(required =>
          criteria.interests!.includes(required)
        );
        if (!hasRequiredInterest) {
          return false;
        }
      }

      // Check forbidden lessons
      if (rules.forbidden_if_learned && criteria.learned_lessons) {
        const hasBlockingLesson = rules.forbidden_if_learned.some(forbidden =>
          criteria.learned_lessons!.includes(forbidden)
        );
        if (hasBlockingLesson) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * Instantiate a plot from a template
   */
  instantiate(
    template_id: string,
    params: {
      soul_id: string;
      assigned_at_personal_tick: number;
      parameter_bindings?: Record<string, any>;
      agent_bindings?: Record<string, string>;
    }
  ): PlotLineInstance | null {
    const template = this.templates.get(template_id);
    if (!template) {
      console.error(`[PlotRegistry] Template ${template_id} not found`);
      return null;
    }

    // Merge default parameters with bindings
    const parameters = {
      ...template.parameters,
      ...params.parameter_bindings,
    };

    const instance: PlotLineInstance = {
      instance_id: `plot_${template_id}_${params.soul_id}_${Date.now()}`,
      template_id: template.id,
      soul_id: params.soul_id,
      assigned_at_personal_tick: params.assigned_at_personal_tick,
      status: 'active',
      current_stage: template.entry_stage,
      stage_entered_at: params.assigned_at_personal_tick,
      stages_visited: [],
      parameters,
      bound_agents: params.agent_bindings ?? {},
    };

    return instance;
  }

  /**
   * Clear all templates (for testing)
   */
  clear(): void {
    this.templates.clear();
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    total: number;
    by_scale: Record<PlotScale, number>;
  } {
    const stats = {
      total: this.templates.size,
      by_scale: {
        micro: 0,
        small: 0,
        medium: 0,
        large: 0,
        epic: 0,
      } as Record<PlotScale, number>,
    };

    for (const template of this.templates.values()) {
      stats.by_scale[template.scale]++;
    }

    return stats;
  }
}

/**
 * Singleton instance
 */
export const plotLineRegistry = new PlotLineRegistry();

/**
 * Helper: Register a plot template (convenience function)
 */
export function registerPlotTemplate(template: PlotLineTemplate): void {
  plotLineRegistry.register(template);
}

/**
 * Helper: Get a plot template (convenience function)
 */
export function getPlotTemplate(template_id: string): PlotLineTemplate | undefined {
  return plotLineRegistry.getTemplate(template_id);
}

/**
 * Helper: Instantiate a plot (convenience function)
 */
export function instantiatePlot(
  template_id: string,
  soul_id: string,
  assigned_at: number,
  bindings?: Record<string, any>
): PlotLineInstance | null {
  return plotLineRegistry.instantiate(template_id, {
    soul_id,
    assigned_at_personal_tick: assigned_at,
    parameter_bindings: bindings,
  });
}
