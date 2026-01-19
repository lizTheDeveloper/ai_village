/**
 * Relationship Component Schema
 *
 * Tracks social relationships between agents including familiarity, affinity,
 * trust, and perceived skills. Critical for social decision-making.
 *
 * Phase 4, Tier 4 - Social Components
 */

import { defineComponent, autoRegister, type Component } from '../index.js';

/**
 * Perceived skill data - what one agent knows about another's abilities
 */
export interface PerceivedSkill {
  skillId: string;
  level: number; // 0-5
  confidence: number; // 0-100
  lastObserved: number; // Tick
}

/**
 * Relationship data between two agents
 */
export interface Relationship {
  targetId: string; // EntityId
  familiarity: number; // 0-100
  affinity: number; // -100 to 100
  trust: number; // 0-100
  lastInteraction: number; // Tick
  interactionCount: number;
  sharedMemories: number;
  sharedMeals: number;
  perceivedSkills: PerceivedSkill[];
}

/**
 * Relationship component - tracks all social connections for an agent
 */
export interface RelationshipComponent extends Component {
  type: 'relationship';
  version: 1;
  relationships: Map<string, Relationship>;
}

/**
 * Relationship component schema
 */
export const RelationshipSchema = autoRegister(
  defineComponent<RelationshipComponent>({
    type: 'relationship',
    version: 1,
    category: 'social',

    fields: {
      relationships: {
        type: 'map',
        itemType: 'object',
        required: true,
        default: new Map(),
        description: 'Map of entity ID to relationship data',
        displayName: 'Relationships',
        visibility: {
          player: true,
          llm: 'summarized', // Only show top relationships to LLM
          agent: true, // Agents know their relationships
          dev: true,
        },
        ui: {
          widget: 'json', // Complex map structure needs JSON editor
          group: 'social',
          order: 1,
          icon: '👥',
        },
        mutable: false, // Use mutators for relationship updates
      },
    },

    ui: {
      icon: '🤝',
      color: '#FF9800',
      priority: 4, // Social info comes after core identity/skills
    },

    llm: {
      promptSection: 'relationships',
      summarize: (data, context) => {
        // Guard against undefined or missing relationships property
        if (!data.relationships || typeof data.relationships.values !== 'function') {
          return 'No relationships yet';
        }

        const relationships = Array.from(data.relationships.values());

        if (relationships.length === 0) {
          return 'No relationships yet';
        }

        // Create entity resolver - uses context if available, otherwise falls back to ID
        const resolveName = context?.entityResolver || ((id: string) => id);

        // Sort by familiarity and get top 5
        const topRelationships = relationships
          .sort((a, b) => b.familiarity - a.familiarity)
          .slice(0, 5);

        const friends = topRelationships.filter((r) => r.affinity > 20);
        const rivals = topRelationships.filter((r) => r.affinity < -20);

        const parts: string[] = [];

        if (friends.length > 0) {
          const friendNames = friends
            .map((r) => `${resolveName(r.targetId)} (affinity: ${r.affinity}, trust: ${r.trust})`)
            .join(', ');
          parts.push(`Friends: ${friendNames}`);
        }

        if (rivals.length > 0) {
          const rivalNames = rivals
            .map((r) => `${resolveName(r.targetId)} (affinity: ${r.affinity})`)
            .join(', ');
          parts.push(`Rivals: ${rivalNames}`);
        }

        const neutralCount = relationships.length - friends.length - rivals.length;
        if (neutralCount > 0) {
          parts.push(`${neutralCount} neutral acquaintances`);
        }

        return parts.join(' | ');
      },
      priority: 2, // Important for social decision-making
    },

    // Custom renderers
    renderers: {
      player: (data) => {
        // Simple count for player UI
        if (!data.relationships || typeof data.relationships.size !== 'number') {
          return '0 relationships';
        }
        return `${data.relationships.size} relationships`;
      },
    },

    // Mutators for safe relationship updates
    mutators: {
      updateRelationship: (entity: any, targetId: string, updates: Partial<Relationship>) => {
        const component = entity.getComponent('relationship') as RelationshipComponent;
        const existing = component.relationships.get(targetId);

        if (!existing) {
          throw new Error(`No relationship found with ${targetId}`);
        }

        // Create updated relationship with clamped values
        const updated: Relationship = {
          ...existing,
          ...updates,
          familiarity: Math.max(
            0,
            Math.min(100, updates.familiarity ?? existing.familiarity)
          ),
          affinity: Math.max(-100, Math.min(100, updates.affinity ?? existing.affinity)),
          trust: Math.max(0, Math.min(100, updates.trust ?? existing.trust)),
        };

        // Update map
        const newRelationships = new Map(component.relationships);
        newRelationships.set(targetId, updated);

        entity.updateComponent({
          ...component,
          relationships: newRelationships,
        });
      },

      addRelationship: (entity: any, targetId: string, initialData?: Partial<Relationship>) => {
        const component = entity.getComponent('relationship') as RelationshipComponent;

        if (component.relationships.has(targetId)) {
          throw new Error(`Relationship with ${targetId} already exists`);
        }

        const newRelationship: Relationship = {
          targetId,
          familiarity: initialData?.familiarity ?? 0,
          affinity: initialData?.affinity ?? 0,
          trust: initialData?.trust ?? 0,
          lastInteraction: initialData?.lastInteraction ?? 0,
          interactionCount: initialData?.interactionCount ?? 0,
          sharedMemories: initialData?.sharedMemories ?? 0,
          sharedMeals: initialData?.sharedMeals ?? 0,
          perceivedSkills: initialData?.perceivedSkills ?? [],
        };

        const newRelationships = new Map(component.relationships);
        newRelationships.set(targetId, newRelationship);

        entity.updateComponent({
          ...component,
          relationships: newRelationships,
        });
      },
    },

    validate: (data): data is RelationshipComponent => {
      if (typeof data !== 'object' || data === null) return false;
      if (!('type' in data) || data.type !== 'relationship') return false;
      if (!('version' in data) || data.version !== 1) return false;

      if (!('relationships' in data)) return false;
      const relationships = data.relationships;
      if (!(relationships instanceof Map)) return false;

      // Validate at least one relationship entry if map is not empty
      for (const [key, value] of relationships) {
        if (typeof key !== 'string') return false;
        if (typeof value !== 'object' || value === null) return false;

        // Type guard for relationship value
        if (!('targetId' in value) || typeof value.targetId !== 'string') return false;
        if (!('familiarity' in value) || typeof value.familiarity !== 'number') return false;
        if (!('affinity' in value) || typeof value.affinity !== 'number') return false;
        if (!('trust' in value) || typeof value.trust !== 'number') return false;
        if (!('perceivedSkills' in value) || !Array.isArray(value.perceivedSkills)) return false;

        // Only check first entry to avoid performance issues
        break;
      }

      return true;
    },

    createDefault: (): RelationshipComponent => ({
      type: 'relationship',
      version: 1,
      relationships: new Map(),
    }),
  })
);
