/**
 * Capability Registry - Single registration point for admin capabilities
 *
 * Each system registers its capabilities once, and both HTML and text views
 * are auto-generated from the same registration.
 */

import type { WebSocket } from 'ws';

// ============================================================================
// Types
// ============================================================================

export type CapabilityCategory =
  | 'overview'      // Dashboard summary
  | 'universes'     // Running games, spawn/stop
  | 'entities'      // Agents, animals, buildings
  | 'world'         // Terrain, maps, spawning
  | 'systems'       // Magic, divinity, research
  | 'media'         // Sprites, recordings, cable
  | 'infrastructure' // LLM, saves, canon
  | 'meta';          // Registry itself

export type ParamType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'entity-id'
  | 'session-id'
  | 'json';

export interface AdminParam {
  name: string;
  type: ParamType;
  required: boolean;
  description: string;
  default?: unknown;
  options?: { value: string; label: string }[];  // For 'select' type
  entityType?: string;  // For 'entity-id' type (e.g., 'agent', 'building')
  validation?: (value: unknown) => boolean | string;
}

export interface AdminAction {
  id: string;
  name: string;
  description: string;
  params: AdminParam[];
  handler: ActionHandler;
  dangerous?: boolean;
  requiresConfirmation?: boolean;
  requiresGame?: boolean;  // Default true - requires connected game
}

export interface AdminQuery {
  id: string;
  name: string;
  description: string;
  params: AdminParam[];
  handler: QueryHandler;
  requiresGame?: boolean;  // Default true
  renderResult?: (data: unknown) => string;  // Custom text rendering
}

export interface AdminLink {
  id: string;
  name: string;
  description: string;
  url: string;  // Can include {session} placeholder
  icon?: string;
  embeddable?: boolean;  // Can be embedded in an iframe
}

export interface AdminCapability {
  id: string;
  name: string;
  description: string;
  category: CapabilityCategory;

  // Tab configuration (for HTML view)
  tab?: {
    icon: string;
    priority: number;  // Lower = first
  };

  // Actions this capability provides
  actions?: AdminAction[];

  // Queries this capability provides
  queries?: AdminQuery[];

  // Links this capability provides (for embeddable content)
  links?: AdminLink[];

  // Custom view renderer (optional)
  renderView?: (context: ViewContext) => Promise<string>;
}

export interface ViewContext {
  sessionId?: string;
  format: 'html' | 'text' | 'json';
  gameClient: WebSocket | null;
  baseUrl: string;
  queryParams: Record<string, string>;
}

export type ActionHandler = (
  params: Record<string, unknown>,
  gameClient: WebSocket | null,
  context: ViewContext
) => Promise<ActionResult>;

export type QueryHandler = (
  params: Record<string, unknown>,
  gameClient: WebSocket | null,
  context: ViewContext
) => Promise<unknown>;

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

// ============================================================================
// Registry
// ============================================================================

class CapabilityRegistryImpl {
  private capabilities = new Map<string, AdminCapability>();
  private categorizedCapabilities = new Map<CapabilityCategory, AdminCapability[]>();

  /**
   * Register a capability
   */
  register(capability: AdminCapability): void {
    if (this.capabilities.has(capability.id)) {
      console.warn(`[CapabilityRegistry] Overwriting capability: ${capability.id}`);
    }

    this.capabilities.set(capability.id, capability);

    // Update category index
    const categoryList = this.categorizedCapabilities.get(capability.category) || [];
    const existingIndex = categoryList.findIndex(c => c.id === capability.id);
    if (existingIndex >= 0) {
      categoryList[existingIndex] = capability;
    } else {
      categoryList.push(capability);
    }
    this.categorizedCapabilities.set(capability.category, categoryList);

    console.log(`[CapabilityRegistry] Registered: ${capability.id} (${capability.category})`);
  }

  /**
   * Get a capability by ID
   */
  get(id: string): AdminCapability | undefined {
    return this.capabilities.get(id);
  }

  /**
   * Get all capabilities
   */
  getAll(): AdminCapability[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Get capabilities by category
   */
  getByCategory(category: CapabilityCategory): AdminCapability[] {
    return this.categorizedCapabilities.get(category) || [];
  }

  /**
   * Get all tabs sorted by priority
   */
  getTabs(): AdminCapability[] {
    return this.getAll()
      .filter(c => c.tab)
      .sort((a, b) => (a.tab!.priority - b.tab!.priority));
  }

  /**
   * Find an action by capability.action ID
   */
  findAction(actionPath: string): { capability: AdminCapability; action: AdminAction } | null {
    // actionPath can be "capability.action" or just "action"
    const parts = actionPath.split('.');
    if (parts.length === 2) {
      const capability = this.capabilities.get(parts[0]);
      const action = capability?.actions?.find(a => a.id === parts[1]);
      if (capability && action) {
        return { capability, action };
      }
    }

    // Search all capabilities
    for (const capability of this.capabilities.values()) {
      const action = capability.actions?.find(a => a.id === actionPath);
      if (action) {
        return { capability, action };
      }
    }

    return null;
  }

  /**
   * Find a query by capability.query ID
   */
  findQuery(queryPath: string): { capability: AdminCapability; query: AdminQuery } | null {
    const parts = queryPath.split('.');
    if (parts.length === 2) {
      const capability = this.capabilities.get(parts[0]);
      const query = capability?.queries?.find(q => q.id === parts[1]);
      if (capability && query) {
        return { capability, query };
      }
    }

    // Search all capabilities
    for (const capability of this.capabilities.values()) {
      const query = capability.queries?.find(q => q.id === queryPath);
      if (query) {
        return { capability, query };
      }
    }

    return null;
  }

  /**
   * Get registry as JSON (for tooling/introspection)
   */
  toJSON(): object {
    const capabilities: Record<string, object> = {};
    for (const [id, cap] of this.capabilities) {
      capabilities[id] = {
        id: cap.id,
        name: cap.name,
        description: cap.description,
        category: cap.category,
        tab: cap.tab,
        actions: cap.actions?.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          params: a.params,
          dangerous: a.dangerous,
          requiresConfirmation: a.requiresConfirmation,
          requiresGame: a.requiresGame ?? true,
        })),
        queries: cap.queries?.map(q => ({
          id: q.id,
          name: q.name,
          description: q.description,
          params: q.params,
          requiresGame: q.requiresGame ?? true,
        })),
        links: cap.links,
      };
    }
    return {
      capabilities,
      categories: Array.from(this.categorizedCapabilities.keys()),
      tabs: this.getTabs().map(t => ({ id: t.id, name: t.name, icon: t.tab?.icon })),
    };
  }
}

// Singleton instance
export const capabilityRegistry = new CapabilityRegistryImpl();

// ============================================================================
// Helper for creating capabilities
// ============================================================================

export function defineCapability(config: AdminCapability): AdminCapability {
  return config;
}

export function defineAction(config: AdminAction): AdminAction {
  return {
    requiresGame: true,
    ...config,
  };
}

export function defineQuery(config: AdminQuery): AdminQuery {
  return {
    requiresGame: true,
    ...config,
  };
}

export function defineLink(config: AdminLink): AdminLink {
  return config;
}
