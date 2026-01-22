/**
 * Resources & Inventory Capability - Divine gift-giving and resource management
 *
 * DISCOVERABLE: The angel can bless mortals with resources, perform miracles
 * of multiplication, and transmute matter.
 *
 * Framing:
 * - Granting gifts = "divine blessing/providence"
 * - Multiplying resources = "loaves and fishes miracle"
 * - Transmutation = "alchemical blessing"
 * - Tool blessing = "consecration"
 * - Hidden caches = "divine revelation"
 * - Preservation = "eternal blessing"
 *
 * This capability allows the angel to directly intervene in the material world,
 * providing for those in need or revealing hidden abundance.
 *
 * Provides admin interface for:
 * - Viewing village resource stockpiles
 * - Viewing agent inventories
 * - Tracking rare and unique items
 * - Monitoring resource flow
 * - Identifying shortages
 * - Spawning divine gifts
 * - Multiplying resources (miracles)
 * - Transmuting items
 * - Blessing tools
 * - Revealing hidden caches
 * - Preserving items
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const ITEM_RARITY_OPTIONS = [
  { value: 'common', label: 'Common Items' },
  { value: 'uncommon', label: 'Uncommon Items' },
  { value: 'rare', label: 'Rare Items' },
  { value: 'legendary', label: 'Legendary Items' },
  { value: 'divine', label: 'Divine Artifacts' },
];

const TRANSMUTATION_TYPE_OPTIONS = [
  { value: 'upgrade', label: 'Upgrade Quality (iron → steel)' },
  { value: 'transform', label: 'Transform Type (axe → sword)' },
  { value: 'sanctify', label: 'Sanctify (mundane → holy)' },
  { value: 'decay', label: 'Decay (punishment/curse)' },
];

const BLESSING_POWER_OPTIONS = [
  { value: 'minor', label: 'Minor Blessing (+10% effectiveness)' },
  { value: 'moderate', label: 'Moderate Blessing (+25% effectiveness)' },
  { value: 'major', label: 'Major Blessing (+50% effectiveness)' },
  { value: 'divine', label: 'Divine Blessing (+100% effectiveness)' },
];

const MULTIPLICATION_FACTOR_OPTIONS = [
  { value: '2', label: 'Double (x2)' },
  { value: '5', label: 'Five-fold (x5)' },
  { value: '10', label: 'Ten-fold (x10)' },
  { value: '100', label: 'Hundred-fold (x100) - Miracle' },
];

// ============================================================================
// Resources & Inventory Capability Definition
// ============================================================================

const resourcesInventoryCapability = defineCapability({
  id: 'resources-inventory',
  name: 'Resources & Inventory',
  description: 'View resources and grant divine gifts. Perform miracles of multiplication and transmutation.',
  category: 'world',

  tab: {
    icon: '📦',
    priority: 5,
  },

  queries: [
    defineQuery({
      id: 'view-village-resources',
      name: 'View Village Resources',
      description: 'See all resources stockpiled in the village',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/resources/village-stockpiles' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          totalResources?: number;
          stockpiles?: Array<{
            resource: string;
            quantity: number;
            location?: string;
            quality?: string;
          }>;
          categories?: Record<string, number>;
        };

        let output = 'VILLAGE RESOURCE STOCKPILES\n';
        output += `${'='.repeat(40)}\n\n`;

        if (result.totalResources !== undefined) {
          output += `Total Resources: ${result.totalResources}\n\n`;
        }

        if (result.categories) {
          output += 'BY CATEGORY:\n';
          Object.entries(result.categories).forEach(([category, count]) => {
            output += `  ${category}: ${count}\n`;
          });
          output += '\n';
        }

        if (result.stockpiles?.length) {
          output += 'DETAILED INVENTORY:\n';
          result.stockpiles.forEach(s => {
            output += `  ${s.resource}: ${s.quantity}`;
            if (s.quality) output += ` [${s.quality}]`;
            if (s.location) output += ` @ ${s.location}`;
            output += '\n';
          });
        } else {
          output += 'The village stockpiles are empty.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-agent-inventory',
      name: 'View Agent Inventory',
      description: 'See what an agent is carrying',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to examine' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/agent/inventory' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          totalItems?: number;
          carryingCapacity?: { current: number; max: number };
          items?: Array<{
            name: string;
            quantity: number;
            type?: string;
            quality?: string;
            blessed?: boolean;
          }>;
        };

        let output = `INVENTORY: ${result.agentName ?? 'Unknown'}\n\n`;

        if (result.carryingCapacity) {
          output += `Carrying: ${result.carryingCapacity.current}/${result.carryingCapacity.max}\n\n`;
        }

        if (result.items?.length) {
          output += 'ITEMS:\n';
          result.items.forEach(item => {
            output += `  ${item.name} x${item.quantity}`;
            if (item.quality) output += ` [${item.quality}]`;
            if (item.blessed) output += ' ✨';
            if (item.type) output += ` (${item.type})`;
            output += '\n';
          });
        } else {
          output += 'Empty handed.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'find-rare-items',
      name: 'Find Rare Items',
      description: 'Locate rare or unique items in the world',
      params: [
        {
          name: 'rarity', type: 'select', required: false,
          options: ITEM_RARITY_OPTIONS,
          description: 'Minimum rarity level',
        },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/resources/find-rare' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          totalFound?: number;
          items?: Array<{
            name: string;
            rarity: string;
            location: string;
            holder?: string;
            properties?: string[];
          }>;
        };

        let output = 'RARE ITEMS IN THE WORLD\n';
        output += `${'='.repeat(40)}\n\n`;

        if (result.totalFound !== undefined) {
          output += `Found: ${result.totalFound} rare items\n\n`;
        }

        if (result.items?.length) {
          result.items.forEach(item => {
            output += `◆ ${item.name} [${item.rarity}]\n`;
            output += `  Location: ${item.location}\n`;
            if (item.holder) {
              output += `  Held by: ${item.holder}\n`;
            }
            if (item.properties?.length) {
              output += `  Properties: ${item.properties.join(', ')}\n`;
            }
            output += '\n';
          });
        } else {
          output += 'No rare items found matching criteria.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-resource-flow',
      name: 'View Resource Flow',
      description: 'See production and consumption rates',
      params: [
        { name: 'resource', type: 'string', required: false, description: 'Specific resource type (optional)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/resources/flow-analysis' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          timeRange?: string;
          flows?: Array<{
            resource: string;
            production: number;
            consumption: number;
            netChange: number;
            trend?: string;
          }>;
          warnings?: string[];
        };

        let output = 'RESOURCE FLOW ANALYSIS\n';
        output += `${'='.repeat(40)}\n\n`;

        if (result.timeRange) {
          output += `Time Range: ${result.timeRange}\n\n`;
        }

        if (result.flows?.length) {
          output += 'RESOURCE | PRODUCTION | CONSUMPTION | NET\n';
          output += '-'.repeat(50) + '\n';
          result.flows.forEach(f => {
            const trend = f.trend ? ` [${f.trend}]` : '';
            output += `${f.resource.padEnd(15)} | +${f.production.toString().padEnd(10)} | -${f.consumption.toString().padEnd(11)} | ${f.netChange >= 0 ? '+' : ''}${f.netChange}${trend}\n`;
          });
          output += '\n';
        }

        if (result.warnings?.length) {
          output += 'WARNINGS:\n';
          result.warnings.forEach(w => {
            output += `  ⚠️  ${w}\n`;
          });
        }

        return output;
      },
    }),

    defineQuery({
      id: 'find-shortages',
      name: 'Find Resource Shortages',
      description: 'Identify resources in short supply',
      params: [
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/resources/find-shortages' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          critical?: Array<{
            resource: string;
            current: number;
            needed: number;
            deficit: number;
            impact?: string;
          }>;
          low?: Array<{
            resource: string;
            current: number;
            daysRemaining?: number;
          }>;
        };

        let output = 'RESOURCE SHORTAGES\n';
        output += `${'='.repeat(40)}\n\n`;

        if (result.critical?.length) {
          output += 'CRITICAL SHORTAGES:\n';
          result.critical.forEach(s => {
            output += `  🔴 ${s.resource}: ${s.current}/${s.needed} (deficit: ${s.deficit})\n`;
            if (s.impact) {
              output += `     Impact: ${s.impact}\n`;
            }
          });
          output += '\n';
        }

        if (result.low?.length) {
          output += 'LOW SUPPLIES:\n';
          result.low.forEach(s => {
            output += `  🟡 ${s.resource}: ${s.current}`;
            if (s.daysRemaining !== undefined) {
              output += ` (~${s.daysRemaining} days remaining)`;
            }
            output += '\n';
          });
          output += '\n';
        }

        if (!result.critical?.length && !result.low?.length) {
          output += 'No shortages detected. The village is well-supplied.';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-item-history',
      name: 'View Item History',
      description: 'Track where an item has been and who has held it',
      params: [
        { name: 'itemId', type: 'entity-id', required: true, description: 'Item to track' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/live/item/history' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          itemName?: string;
          created?: string;
          currentHolder?: string;
          currentLocation?: string;
          history?: Array<{
            timestamp: string;
            event: string;
            agent?: string;
            location?: string;
          }>;
        };

        let output = `ITEM HISTORY: ${result.itemName ?? 'Unknown'}\n`;
        output += `${'='.repeat(40)}\n\n`;

        if (result.created) {
          output += `Created: ${result.created}\n`;
        }
        if (result.currentHolder) {
          output += `Current Holder: ${result.currentHolder}\n`;
        }
        if (result.currentLocation) {
          output += `Current Location: ${result.currentLocation}\n`;
        }
        output += '\n';

        if (result.history?.length) {
          output += 'HISTORY:\n';
          result.history.forEach(h => {
            output += `  [${h.timestamp}] ${h.event}`;
            if (h.agent) output += ` - ${h.agent}`;
            if (h.location) output += ` @ ${h.location}`;
            output += '\n';
          });
        } else {
          output += 'No history available for this item.';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'grant-gift',
      name: 'Grant Divine Gift',
      description: 'Spawn an item for an agent as a divine blessing',
      dangerous: false,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to bless' },
        { name: 'itemType', type: 'string', required: true, description: 'Type of item to grant' },
        { name: 'quantity', type: 'number', required: false, description: 'Quantity (default: 1)' },
        { name: 'quality', type: 'string', required: false, description: 'Quality level (normal/fine/masterwork)' },
        { name: 'message', type: 'string', required: false, description: 'Divine message to accompany gift' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        const quantity = params.quantity ?? 1;
        const quality = params.quality ?? 'normal';
        return {
          success: true,
          message: `Granted ${quantity}x ${quality} ${params.itemType} to agent ${params.agentId}${params.message ? ` with message: "${params.message}"` : ''}`
        };
      },
    }),

    defineAction({
      id: 'multiply-resource',
      name: 'Multiply Resource',
      description: 'Multiply a stockpile (loaves and fishes miracle)',
      dangerous: true,
      params: [
        { name: 'resourceType', type: 'string', required: true, description: 'Resource to multiply' },
        {
          name: 'factor', type: 'select', required: true,
          options: MULTIPLICATION_FACTOR_OPTIONS,
          description: 'Multiplication factor',
        },
        { name: 'location', type: 'string', required: false, description: 'Specific location (optional)' },
        { name: 'proclamation', type: 'string', required: false, description: 'Divine proclamation' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        return {
          success: true,
          message: `Multiplied ${params.resourceType} by ${params.factor}! A miracle of abundance.${params.proclamation ? ` "${params.proclamation}"` : ''}`
        };
      },
    }),

    defineAction({
      id: 'transmute-item',
      name: 'Transmute Item',
      description: 'Change one item into another through divine alchemy',
      dangerous: true,
      params: [
        { name: 'itemId', type: 'entity-id', required: true, description: 'Item to transmute' },
        {
          name: 'transmutationType', type: 'select', required: true,
          options: TRANSMUTATION_TYPE_OPTIONS,
          description: 'Type of transmutation',
        },
        { name: 'targetType', type: 'string', required: false, description: 'Target item type (for transform)' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for transmutation' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        let message = `Transmuted item ${params.itemId} via ${params.transmutationType}`;
        if (params.targetType) {
          message += ` to ${params.targetType}`;
        }
        if (params.reason) {
          message += ` - ${params.reason}`;
        }
        return { success: true, message };
      },
    }),

    defineAction({
      id: 'bless-tool',
      name: 'Bless Tool',
      description: 'Improve a tool\'s effectiveness through consecration',
      dangerous: false,
      params: [
        { name: 'itemId', type: 'entity-id', required: true, description: 'Tool to bless' },
        {
          name: 'power', type: 'select', required: true,
          options: BLESSING_POWER_OPTIONS,
          description: 'Blessing power',
        },
        { name: 'duration', type: 'number', required: false, description: 'Duration in days (0 = permanent)' },
        { name: 'purpose', type: 'string', required: false, description: 'Purpose of blessing' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        const duration = params.duration ?? 0;
        const permanent = duration === 0;
        return {
          success: true,
          message: `Blessed tool ${params.itemId} with ${params.power} power${permanent ? ' (permanent)' : ` for ${duration} days`}${params.purpose ? ` - ${params.purpose}` : ''}`
        };
      },
    }),

    defineAction({
      id: 'reveal-hidden-cache',
      name: 'Reveal Hidden Cache',
      description: 'Reveal a hidden resource cache in the world',
      dangerous: false,
      params: [
        { name: 'cacheType', type: 'string', required: true, description: 'Type of resources in cache' },
        { name: 'x', type: 'number', required: true, description: 'X coordinate' },
        { name: 'y', type: 'number', required: true, description: 'Y coordinate' },
        { name: 'value', type: 'number', required: false, description: 'Value/quantity (default: random)' },
        { name: 'discoverer', type: 'entity-id', required: false, entityType: 'agent', description: 'Agent who finds it (optional)' },
        { name: 'vision', type: 'string', required: false, description: 'Vision/dream accompanying revelation' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        let message = `Revealed ${params.cacheType} cache at (${params.x}, ${params.y})`;
        if (params.discoverer) {
          message += ` to agent ${params.discoverer}`;
        }
        if (params.vision) {
          message += ` with vision: "${params.vision}"`;
        }
        return { success: true, message };
      },
    }),

    defineAction({
      id: 'preserve-item',
      name: 'Preserve Item',
      description: 'Make an item indestructible/preserved',
      dangerous: false,
      params: [
        { name: 'itemId', type: 'entity-id', required: true, description: 'Item to preserve' },
        { name: 'preservationType', type: 'string', required: false, description: 'Type (eternal/temporal)' },
        { name: 'reason', type: 'string', required: false, description: 'Reason for preservation' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }
        const type = params.preservationType ?? 'eternal';
        return {
          success: true,
          message: `Preserved item ${params.itemId} with ${type} preservation${params.reason ? ` - ${params.reason}` : ''}`
        };
      },
    }),
  ],
});

capabilityRegistry.register(resourcesInventoryCapability);
