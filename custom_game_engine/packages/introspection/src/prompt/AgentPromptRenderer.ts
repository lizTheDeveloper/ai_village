/**
 * AgentPromptRenderer - Generates agent self-awareness prompts
 *
 * Part of Phase 3: Prompt Integration
 *
 * Similar to PromptRenderer but filters for agent-visible fields only.
 * Used for NPC self-awareness - what agents know about themselves.
 */

import type { ComponentSchema, Component } from '../types/ComponentSchema.js';
import type { FieldSchema } from '../types/FieldSchema.js';
import { ComponentRegistry } from '../registry/ComponentRegistry.js';

/**
 * Field data for rendering
 */
interface FieldData {
  name: string;
  field: FieldSchema;
  value: unknown;
}

/**
 * Renders component data as agent self-awareness prompts
 */
export class AgentPromptRenderer {
  /**
   * Render all agent-visible components for an entity
   *
   * This generates a filtered prompt showing only what the agent
   * should know about themselves (visibility.agent === true)
   *
   * @param entity - Entity with components map
   * @returns Formatted prompt string for agent self-awareness
   */
  static renderEntity(entity: { id: string; components: Map<string, any> }): string {
    let prompt = '';
    const sections: Array<{ priority: number; section: string; content: string }> = [];

    // Process each component that has a schema
    for (const [componentType, componentData] of entity.components.entries()) {
      const schema = ComponentRegistry.get(componentType);
      if (!schema) continue; // Skip non-schema'd components

      // Check if component should be included in agent prompts
      if (schema.llm?.includeInAgentPrompt === false) {
        continue;
      }

      // Check if component has any agent-visible fields
      const hasAgentFields = Object.values(schema.fields).some(field =>
        field.visibility.agent === true
      );

      if (!hasAgentFields) {
        continue; // Skip components with no agent visibility
      }

      // Generate prompt from schema (agent-filtered)
      const content = this.renderComponent(componentData, schema);
      if (content) {
        sections.push({
          priority: schema.llm?.priority ?? 100,
          section: schema.llm?.promptSection ?? 'Self-Knowledge',
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
   * Render a single component for agent self-awareness
   *
   * Only includes fields where visibility.agent === true
   *
   * @param component - Component data object
   * @param schema - Component schema with field metadata
   * @returns Formatted prompt section for agent self-awareness
   */
  static renderComponent<T extends Component>(
    component: T,
    schema: ComponentSchema<T>
  ): string {
    // Group fields by section
    const sections = new Map<string, FieldData[]>();

    for (const [fieldName, fieldSchema] of Object.entries(schema.fields)) {
      // Only include agent-visible fields
      if (fieldSchema.visibility.agent !== true) continue;

      const value = (component as Record<string, unknown>)[fieldName];

      // Get LLM config for this field
      const llmConfig = (fieldSchema as FieldSchema & { llm?: unknown }).llm as {
        alwaysInclude?: boolean;
        hideIf?: (value: unknown) => boolean;
        promptSection?: string;
        promptLabel?: string;
        format?: (value: unknown) => string;
      } | undefined;

      // Check hideIf condition
      if (llmConfig?.hideIf && llmConfig.hideIf(value)) {
        continue;
      }

      // Skip default values unless alwaysInclude is set
      if (!llmConfig?.alwaysInclude && value === fieldSchema.default) {
        continue;
      }

      // Determine section
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

    // If no agent-visible fields, return empty
    if (sections.size === 0) {
      return '';
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
        const llmConfig = (field as FieldSchema & { llm?: { promptLabel?: string } }).llm;
        const label = llmConfig?.promptLabel || field.displayName || name;
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
   * Format a field value for agent self-awareness
   * Uses same formatting as PromptRenderer for consistency
   */
  private static formatValue(value: unknown, field: FieldSchema): string {
    // Use custom formatter if provided
    const llmConfig = (field as FieldSchema & { llm?: { format?: (value: unknown) => string } }).llm;
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
        if (typeof value !== 'number') return String(value);

        // Format with range context if available
        if (field.range) {
          const [min, max] = field.range;
          const percentage = Math.round(((value - min) / (max - min)) * 100);
          return `${value} (${percentage}%)`;
        }
        return String(value);

      case 'enum':
        return String(value);

      case 'array':
        if (Array.isArray(value)) {
          if (value.length === 0) return 'none';
          return value.join(', ');
        }
        return String(value);

      case 'map':
        if (typeof value === 'object' && value !== null) {
          const entries = Object.entries(value);
          if (entries.length === 0) return 'none';
          return entries.map(([k, v]) => `${k}: ${v}`).join(', ');
        }
        return String(value);

      case 'object':
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        return String(value);

      case 'string':
      default:
        return String(value);
    }
  }
}
