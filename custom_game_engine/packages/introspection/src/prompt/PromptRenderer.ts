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
  value: unknown;
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

      const value = (component as Record<string, unknown>)[fieldName];
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

      const value = (component as Record<string, unknown>)[fieldName];

      // Skip null/undefined/empty values unless explicitly required
      const llmConfig = (fieldSchema as FieldSchema & { llm?: unknown }).llm as {
        alwaysInclude?: boolean;
        hideIf?: (value: unknown) => boolean;
        promptSection?: string;
        promptLabel?: string;
        format?: (value: unknown) => string;
      } | undefined;
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
   * Format a field value for LLM consumption
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
  private static formatArrayOfObjects(arr: unknown[], field: FieldSchema): string {
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
  private static formatMapOfObjects(entries: Array<[string, unknown]>, field: FieldSchema): string {
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
  private static formatComplexValue(obj: unknown): string {
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }

    // Type guard helper for checking property types
    const hasStringProp = (o: object, key: string): boolean => key in o && typeof (o as Record<string, unknown>)[key] === 'string';
    const hasNumberProp = (o: object, key: string): boolean => key in o && typeof (o as Record<string, unknown>)[key] === 'number';

    // Special handling for common patterns
    if ('itemId' in obj && 'quantity' in obj) {
      // InventorySlot
      const objData = obj as Record<string, unknown>;
      if (!objData.itemId) return 'empty';
      const quality = hasNumberProp(obj, 'quality') ? ` (Q${objData.quality})` : '';
      return `${objData.itemId} ×${objData.quantity}${quality}`;
    }

    if ('equipmentId' in obj && 'slot' in obj) {
      // EquipmentSlot
      const objData = obj as Record<string, unknown>;
      const quality = hasNumberProp(obj, 'quality') ? ` (Q${objData.quality})` : '';
      const durability = objData.durability !== undefined ? ` [${objData.durability}%]` : '';
      return `${objData.equipmentId}${quality}${durability}`;
    }

    if ('targetId' in obj && 'affinity' in obj) {
      // Relationship
      const objData = obj as Record<string, unknown>;
      if (typeof objData.affinity !== 'number') return String(obj);
      const roundedAffinity = Math.round(objData.affinity * 100) / 100;
      const affinity = objData.affinity > 0 ? `+${roundedAffinity}` : roundedAffinity;
      const roundedTrust = hasNumberProp(obj, 'trust') && typeof objData.trust === 'number' ? Math.round(objData.trust * 100) / 100 : undefined;
      const trust = roundedTrust !== undefined ? `, trust ${roundedTrust}` : '';
      return `${objData.targetId} (affinity ${affinity}${trust})`;
    }

    if ('agentId' in obj && 'overallSentiment' in obj) {
      // SocialMemory
      const objData = obj as Record<string, unknown>;
      if (typeof objData.overallSentiment !== 'number') return String(obj);
      const sentiment = objData.overallSentiment > 0 ? 'positive' : objData.overallSentiment < 0 ? 'negative' : 'neutral';
      const trust = hasNumberProp(obj, 'trust') && typeof objData.trust === 'number' ? `, trust ${Math.round(objData.trust * 100)}%` : '';
      return `${objData.agentId} (${sentiment}${trust})`;
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
   * Get available actions from behavior registry
   *
   * Introspects the behavior registry to generate a list of actions this agent can perform.
   * Filters based on:
   * - Skills component (if present) - uses getAvailableActions from SkillsComponent
   * - Behavior registry metadata (descriptions)
   *
   * @param entity - Entity with components map
   * @param behaviorRegistry - Optional behavior registry to introspect
   * @returns Array of action strings with descriptions
   */
  static renderAvailableActions(
    entity: { components: Map<string, any> },
    behaviorRegistry?: any
  ): string[] {
    const actions: string[] = [];

    // If no behavior registry provided, return empty array
    if (!behaviorRegistry) {
      return actions;
    }

    // Get skills component to filter skill-based actions
    const skills = entity.components.get('skills');
    const skillLevels = skills?.levels ?? {};

    // Get all registered behaviors from the registry
    const registeredBehaviors = behaviorRegistry.getRegisteredBehaviors?.() ?? [];

    for (const behaviorName of registeredBehaviors) {
      const meta = behaviorRegistry.get?.(behaviorName);

      if (!meta) continue;

      // Check if this behavior requires skills that the agent doesn't have
      if (!this.canPerformBehavior(behaviorName, skillLevels)) {
        continue;
      }

      // Format action with description if available
      if (meta.description) {
        actions.push(`${behaviorName}: ${meta.description}`);
      } else {
        actions.push(behaviorName);
      }
    }

    return actions;
  }

  /**
   * Check if agent has required skills for a behavior.
   * Implements progressive skill reveal logic from SkillsComponent.
   */
  private static canPerformBehavior(behaviorName: string, skills: Record<string, number>): boolean {
    // Universal actions - always available
    const universalActions = new Set([
      'wander', 'idle', 'rest', 'sleep', 'seek_sleep', 'forced_sleep',
      'eat', 'drink', 'talk', 'follow', 'follow_agent', 'gather',
      'pick', 'harvest', 'seek_food', 'deposit_items', 'flee_to_home',
      'approach', 'observe', 'explore', 'flee_danger', 'seek_water',
      'seek_shelter', 'seek_warmth', 'seek_cooling', 'navigate',
      'call_meeting', 'attend_meeting', 'player_controlled'
    ]);

    if (universalActions.has(behaviorName)) {
      return true;
    }

    // Skill-gated actions
    const farmingLevel = skills.farming ?? 0;
    const cookingLevel = skills.cooking ?? 0;
    const craftingLevel = skills.crafting ?? 0;
    const buildingLevel = skills.building ?? 0;
    const animalHandlingLevel = skills.animal_handling ?? 0;
    const medicineLevel = skills.medicine ?? 0;
    const combatLevel = skills.combat ?? 0;
    const magicLevel = skills.magic ?? 0;

    // Farming actions (level 1+)
    if (['plant', 'till', 'farm', 'water', 'fertilize'].includes(behaviorName)) {
      return farmingLevel >= 1;
    }

    // Cooking actions (level 1+)
    if (['cook'].includes(behaviorName)) {
      return cookingLevel >= 1;
    }

    // Crafting actions (level 1+)
    if (['craft'].includes(behaviorName)) {
      return craftingLevel >= 1;
    }

    // Building actions (level 1+)
    if (['build', 'plan_build', 'tile_build', 'material_transport', 'repair', 'upgrade'].includes(behaviorName)) {
      return buildingLevel >= 1;
    }

    // Animal handling (level 2+)
    if (['tame_animal', 'house_animal', 'butcher'].includes(behaviorName)) {
      return animalHandlingLevel >= 2;
    }

    // Medicine (level 2+)
    if (['heal'].includes(behaviorName)) {
      return medicineLevel >= 2;
    }

    // Combat and hunting (level 1+)
    if (['initiate_combat', 'hunt'].includes(behaviorName)) {
      return combatLevel >= 1;
    }

    // Magic (level 1+)
    if (['cast_spell', 'pray', 'meditate', 'group_pray'].includes(behaviorName)) {
      return magicLevel >= 1;
    }

    // Research and specialized behaviors (level 2+)
    if (['research'].includes(behaviorName)) {
      return (skills.research ?? 0) >= 2;
    }

    // Trade (level 1+)
    if (['trade'].includes(behaviorName)) {
      return (skills.trade ?? 0) >= 1;
    }

    // Special behaviors - always allow (queue management, goals, etc.)
    if ([
      'set_priorities', 'set_personal_goal', 'set_medium_term_goal',
      'set_group_goal', 'sleep_until_queue_complete', 'follow_reporting_target',
      'explore_frontier', 'explore_spiral', 'follow_gradient', 'work', 'help'
    ].includes(behaviorName)) {
      return true;
    }

    // Default: allow if we don't recognize it (assume it's a custom behavior)
    return true;
  }
}
