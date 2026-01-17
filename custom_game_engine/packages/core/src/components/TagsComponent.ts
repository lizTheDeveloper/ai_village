import type { Component, ComponentSchema } from '../ecs/Component.js';

/**
 * Tags for categorization and queries.
 */
export interface TagsComponent extends Component {
  type: 'tags';
  tags: string[];
}

/**
 * Create a tags component.
 */
export function createTagsComponent(...tags: string[]): TagsComponent {
  return {
    type: 'tags',
    version: 1,
    tags: [...tags],
  };
}

/**
 * Tags component schema.
 */
export const TagsComponentSchema: ComponentSchema<TagsComponent> = {
  type: 'tags',
  version: 1,
  fields: [{ name: 'tags', type: 'stringArray', required: true, default: [] }],
  validate: (data: unknown): data is TagsComponent => {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    return d.type === 'tags' && Array.isArray(d.tags);
  },
  createDefault: () => createTagsComponent(),
};
