/**
 * PromptRenderer - Generates LLM prompts from component schemas
 *
 * Part of Phase 3: Prompt Integration
 *
 * Automatically generates LLM context from component schemas by:
 * - Filtering for LLM-visible fields (visibility.llm === true or 'summarized')
 * - Using summarize functions when provided
 * - Grouping fields by promptSection
 * - Formatting values appropriately for LLM consumption
 */

import type { ComponentSchema, Component } from '../types/ComponentSchema.js';
import type { FieldSchema } from '../types/FieldSchema.js';
import type { SummarizeContext } from '../types/LLMConfig.js';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';
import { isVisibleToLLM, shouldSummarizeForLLM } from '../types/VisibilityTypes.js';

/**
 * Field data for rendering
 */
interface FieldData {
  name: string;
  field: FieldSchema;
  value: any;
}

/**
 * Renders component data as LLM prompt sections
 */
export class PromptRenderer {
  /**
   * Render all LLM-visible components for an entity
   *
   * @param entity - Entity with components map
   * @param world - Optional world instance for entity resolution
   * @returns Formatted prompt string with all schema'd components
   */
  static renderEntity(entity: { id: string; components: Map<string, any> }, world?: any): string {
    let prompt = '';
    const sections: Array<{ priority: number; section: string; content: string }> = [];

    // Build context for summarize functions
    const context: SummarizeContext | undefined = world ? {
      world,
      entityResolver: (id: string) => {
        const targetEntity = world.getEntity?.(id);
        if (!targetEntity) return id;
        const identity = targetEntity.components?.get('identity');
        return identity?.name || id;
      }
    } : undefined;

    // Process each component that has a schema
    for (const [componentType, componentData] of entity.components.entries()) {
      const schema = ComponentRegistry.get(componentType);
      if (!schema) continue; // Skip non-schema'd components

      // Check if component has any LLM-visible fields
      const hasLLMFields = Object.values(schema.fields).some(field =>
        isVisibleToLLM(field.visibility)
      );

      if (!hasLLMFields && !schema.llm?.summarize) {
        continue; // Skip components with no LLM visibility
      }

      // Use custom LLM renderer if provided
      if (schema.renderers?.llm) {
        const customContent = schema.renderers.llm(componentData);
        if (customContent) {
          sections.push({
            priority: schema.llm?.priority ?? 100,
            section: schema.llm?.promptSection ?? 'Other',
            content: customContent
          });
        }
        continue;
      }

      // Generate prompt from schema
      const content = this.renderComponent(componentData, schema, context);
      if (content) {
        sections.push({
          priority: schema.llm?.priority ?? 100,
          section: schema.llm?.promptSection ?? 'Other',
          content
        });
      }
    }

    // Sort by priority (lower = earlier in prompt)
    sections.sort((a, b) => a.priority - b.priority);

    // Combine sections
    for (const { section, content } of sections) {
      prompt += `## ${section}\n${content}\n\n`;
    }

    return prompt;
  }

  /**
   * Render a single component using its schema
   *
   * @param component - Component data object
   * @param schema - Component schema with field metadata
   * @param context - Optional context for entity resolution
   * @returns Formatted prompt section for this component
   */
  static renderComponent<T extends Component>(
    component: T,
    schema: ComponentSchema<T>,
    context?: SummarizeContext
  ): string {
    // Use summarize function if provided and visibility is 'summarized'
    if (schema.llm?.summarize) {
      // Check if ANY field is set to 'summarized'
      const hasSummarizedField = Object.values(schema.fields).some(field =>
        field.visibility.llm === 'summarized'
      );

      if (hasSummarizedField) {
        const summary = schema.llm.summarize(component, context);
        if (schema.llm.maxLength && summary.length > schema.llm.maxLength) {
          return summary.substring(0, schema.llm.maxLength) + '...';
        }
        return summary + '\n';
      }
    }

    // Use template if provided
    if (schema.llm?.template) {
      return this.renderFromTemplate(component, schema);
    }

    // Generate detailed field-by-field prompt
    return this.renderDetailed(component, schema);
  }

  /**
   * Render using a template string
   */
  private static renderFromTemplate<T extends Component>(
    component: T,
    schema: ComponentSchema<T>
  ): string {
    let output = schema.llm!.template!;

    // Replace {fieldName} placeholders
    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      if (!isVisibleToLLM(fieldSchema.visibility)) continue;

      const value = (component as any)[fieldName];
      const formatted = this.formatValue(value, fieldSchema);
      output = output.replace(`{${fieldName}}`, formatted);
    }

    return output + '\n';
  }

  /**
   * Render detailed field-by-field output
   */
  private static renderDetailed<T extends Component>(
    component: T,
    schema: ComponentSchema<T>
  ): string {
    // Group fields by section
    const sections = new Map<string, FieldData[]>();

    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      // Only include LLM-visible fields
      if (!isVisibleToLLM(fieldSchema.visibility)) continue;

      const value = (component as any)[fieldName];

      // Skip null/undefined/empty values unless explicitly required
      const llmConfig = (fieldSchema as any).llm;
      if ((value === null || value === undefined) && !llmConfig?.alwaysInclude) {
        continue;
      }

      // Skip empty strings unless explicitly required
      if (value === '' && !llmConfig?.alwaysInclude) {
        continue;
      }

      // Skip empty arrays unless explicitly required
      if (Array.isArray(value) && value.length === 0 && !llmConfig?.alwaysInclude) {
        continue;
      }

      // Skip empty objects unless explicitly required
      if (typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === 0 && !llmConfig?.alwaysInclude) {
        continue;
      }

      // Check hideIf condition
      if (llmConfig?.hideIf && llmConfig.hideIf(value)) {
        continue;
      }

      // Skip default values unless alwaysInclude is set
      if (!llmConfig?.alwaysInclude && value === fieldSchema.default) {
        continue;
      }

      // Determine section (use field-level or component-level promptSection)
      const sectionName = llmConfig?.promptSection || schema.llm?.promptSection || 'Details';

      if (!sections.has(sectionName)) {
        sections.set(sectionName, []);
      }

      sections.get(sectionName)!.push({
        name: fieldName,
        field: fieldSchema,
        value
      });
    }

    // Render all sections
    let output = '';
    const includeFieldNames = schema.llm?.includeFieldNames !== false;

    for (const [sectionName, fields] of sections) {
      // Only add sub-section header if we have multiple sections
      if (sections.size > 1) {
        output += `### ${sectionName}\n`;
      }

      for (const { name, field, value } of fields) {
        const label = (field as any).llm?.promptLabel || field.displayName || name;
        const formatted = this.formatValue(value, field);

        if (includeFieldNames) {
          output += `${label}: ${formatted}\n`;
        } else {
          output += `${formatted}\n`;
        }
      }

      if (sections.size > 1) {
        output += '\n';
      }
    }

    return output;
  }

  /**
   * Format a field value for LLM consumption
   */
  private static formatValue(value: any, field: FieldSchema): string {
    // Use custom formatter if provided
    const llmConfig = (field as any).llm;
    if (llmConfig?.format) {
      return llmConfig.format(value);
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      return 'none';
    }

    // Format by type
    switch (field.type) {
      case 'boolean':
        return value ? 'yes' : 'no';

      case 'number':
        // Round to 2 decimal places for cleaner output
        const rounded = Math.round(value * 100) / 100;

        // Format with range context if available
        if (field.range) {
          const [min, max] = field.range;
          const percentage = Math.round(((value - min) / (max - min)) * 100);
          return `${rounded} (${percentage}%)`;
        }
        return String(rounded);

      case 'enum':
        return String(value);

      case 'array':
        if (Array.isArray(value)) {
          if (value.length === 0) return 'none';

          // Handle array of primitives
          if (field.itemType === 'string' || field.itemType === 'number' || field.itemType === 'boolean') {
            // Round numbers to 2 decimal places
            if (field.itemType === 'number') {
              return value.map((v: number) => Math.round(v * 100) / 100).join(', ');
            }
            return value.join(', ');
          }

          // Handle array of objects - format each object
          if (field.itemType === 'object') {
            return this.formatArrayOfObjects(value, field);
          }

          // Fallback: join as strings
          return value.map(v => this.formatComplexValue(v)).join(', ');
        }
        return String(value);

      case 'map':
        // Handle Map instances
        if (value instanceof Map) {
          if (value.size === 0) return 'none';
          const entries = Array.from(value.entries());

          // Check if values are objects
          const firstValue = entries[0]?.[1];
          if (typeof firstValue === 'object' && firstValue !== null) {
            return this.formatMapOfObjects(entries, field);
          }

          // Round numeric values to 2 decimal places
          return entries.map(([k, v]) => {
            if (typeof v === 'number') {
              const rounded = Math.round(v * 100) / 100;
              return `${k}: ${rounded}`;
            }
            return `${k}: ${v}`;
          }).join(', ');
        }

        // Handle plain objects as maps
        if (typeof value === 'object' && value !== null) {
          const entries = Object.entries(value);
          if (entries.length === 0) return 'none';

          // Check if values are objects
          const firstValue = entries[0]?.[1];
          if (typeof firstValue === 'object' && firstValue !== null) {
            return this.formatMapOfObjects(entries, field);
          }

          // Round numeric values to 2 decimal places
          return entries.map(([k, v]) => {
            if (typeof v === 'number') {
              const rounded = Math.round(v * 100) / 100;
              return `${k}: ${rounded}`;
            }
            return `${k}: ${v}`;
          }).join(', ');
        }
        return String(value);

      case 'object':
        if (typeof value === 'object' && value !== null) {
          return this.formatComplexValue(value);
        }
        return String(value);

      case 'string':
      default:
        return String(value);
    }
  }

  /**
   * Format an array of objects in an LLM-friendly way
   */
  private static formatArrayOfObjects(arr: any[], field: FieldSchema): string {
    // Limit to first 10 items to avoid token bloat
    const items = arr.slice(0, 10);

    // Format each object
    const formatted = items.map(item => {
      if (typeof item !== 'object' || item === null) {
        return String(item);
      }

      // Special handling for common patterns
      if ('itemId' in item && 'quantity' in item) {
        // InventorySlot pattern
        if (!item.itemId) return null;
        return `${item.itemId} (${item.quantity})`;
      }

      if ('equipmentId' in item && 'slot' in item) {
        // EquipmentSlot pattern
        return `${item.equipmentId} in ${item.slot}`;
      }

      // Generic object formatting - show key fields
      return this.formatComplexValue(item);
    }).filter(Boolean);

    if (formatted.length === 0) return 'none';

    const result = formatted.join(', ');
    if (arr.length > 10) {
      return `${result} + ${arr.length - 10} more`;
    }
    return result;
  }

  /**
   * Format a map of objects in an LLM-friendly way
   */
  private static formatMapOfObjects(entries: Array<[string, any]>, field: FieldSchema): string {
    // Limit to first 10 entries
    const limited = entries.slice(0, 10);

    const formatted = limited.map(([key, val]) => {
      if (typeof val !== 'object' || val === null) {
        // Round numbers to 2 decimal places
        if (typeof val === 'number') {
          const rounded = Math.round(val * 100) / 100;
          return `${key}: ${rounded}`;
        }
        return `${key}: ${val}`;
      }

      // Format the object value
      const formattedVal = this.formatComplexValue(val);
      return `${key}: ${formattedVal}`;
    });

    const result = formatted.join(' | ');
    if (entries.length > 10) {
      return `${result} | +${entries.length - 10} more`;
    }
    return result;
  }

  /**
   * Format a complex object in a compact, LLM-friendly way
   * Shows only the most relevant fields
   */
  private static formatComplexValue(obj: any): string {
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }

    // Special handling for common patterns
    if ('itemId' in obj && 'quantity' in obj) {
      // InventorySlot
      if (!obj.itemId) return 'empty';
      const quality = obj.quality ? ` (Q${obj.quality})` : '';
      return `${obj.itemId} ×${obj.quantity}${quality}`;
    }

    if ('equipmentId' in obj && 'slot' in obj) {
      // EquipmentSlot
      const quality = obj.quality ? ` (Q${obj.quality})` : '';
      const durability = obj.durability !== undefined ? ` [${obj.durability}%]` : '';
      return `${obj.equipmentId}${quality}${durability}`;
    }

    if ('targetId' in obj && 'affinity' in obj) {
      // Relationship
      const roundedAffinity = Math.round(obj.affinity * 100) / 100;
      const affinity = obj.affinity > 0 ? `+${roundedAffinity}` : roundedAffinity;
      const roundedTrust = obj.trust !== undefined ? Math.round(obj.trust * 100) / 100 : undefined;
      const trust = roundedTrust !== undefined ? `, trust ${roundedTrust}` : '';
      return `${obj.targetId} (affinity ${affinity}${trust})`;
    }

    if ('agentId' in obj && 'overallSentiment' in obj) {
      // SocialMemory
      const sentiment = obj.overallSentiment > 0 ? 'positive' : obj.overallSentiment < 0 ? 'negative' : 'neutral';
      const trust = obj.trust !== undefined ? `, trust ${Math.round(obj.trust * 100)}%` : '';
      return `${obj.agentId} (${sentiment}${trust})`;
    }

    // Generic object - show up to 3 key-value pairs
    const entries = Object.entries(obj).slice(0, 3);
    if (entries.length === 0) return '{}';

    const parts = entries.map(([k, v]) => {
      if (typeof v === 'object' && v !== null) {
        return `${k}: {…}`;
      }
      // Round numbers to 2 decimal places
      if (typeof v === 'number') {
        const rounded = Math.round(v * 100) / 100;
        return `${k}: ${rounded}`;
      }
      return `${k}: ${v}`;
    });

    const result = `{${parts.join(', ')}}`;
    if (Object.keys(obj).length > 3) {
      return `${result}…`;
    }
    return result;
  }

  /**
   * Get available actions from behavior schemas (future implementation)
   * This will introspect behavior components to generate action lists
   */
  static renderAvailableActions(entity: { components: Map<string, any> }): string[] {
    // TODO: Implement behavior introspection in Phase 5
    return [];
  }
}
