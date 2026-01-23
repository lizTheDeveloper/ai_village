/**
 * Corruption Capability - View and manage corrupted entities, proto-realities, and the rejection realm
 *
 * Per the game's Conservation of Game Matter principle: entities are never deleted,
 * only marked as corrupted and preserved. This capability allows angels to inspect
 * and manage corrupted content.
 *
 * Tone: Unsettling. Corruption is serious. Recovery is uncertain.
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

const CORRUPTION_REASON_OPTIONS = [
  { value: 'all', label: 'All Reasons' },
  { value: 'validation_failed', label: 'Validation Failed' },
  { value: 'malformed_data', label: 'Malformed Data' },
  { value: 'logic_error', label: 'Logic Error' },
  { value: 'reality_breaking', label: 'Reality Breaking' },
  { value: 'unstable_magic', label: 'Unstable Magic' },
  { value: 'too_overpowered', label: 'Too Overpowered' },
  { value: 'lore_breaking', label: 'Lore Breaking' },
  { value: 'too_meta', label: 'Too Meta' },
];

const REJECTION_REALM_OPTIONS = [
  { value: 'all', label: 'All Realms' },
  { value: 'limbo', label: 'Limbo (Mild corruption)' },
  { value: 'void', label: 'The Void (Severe corruption)' },
  { value: 'forbidden_library', label: 'Forbidden Library (Too powerful)' },
  { value: 'rejected_realm', label: 'Rejected Realm (Meta-breaking)' },
  { value: 'proto_reality', label: 'Proto-Realities (Before time)' },
  { value: 'forgotten_realm', label: 'Forgotten Realm (Deleted by creators)' },
];

const DANGER_LEVEL_OPTIONS = [
  { value: 'any', label: 'Any Danger Level' },
  { value: 'low', label: 'Low (1-3)' },
  { value: 'medium', label: 'Medium (4-6)' },
  { value: 'high', label: 'High (7-9)' },
  { value: 'extreme', label: 'Extreme (10)' },
];

const corruptionCapability = defineCapability({
  id: 'corruption',
  name: 'Corruption',
  description: 'View and manage corrupted entities, proto-realities, and the rejection realm. Nothing is ever deleted - only marked as corrupted and preserved.',
  category: 'entities',

  tab: {
    icon: '🕳️',
    priority: 7,
  },

  queries: [
    defineQuery({
      id: 'view-corrupted-entities',
      name: 'View Corrupted Entities',
      description: 'List all entities marked as corrupted. These entities still exist but are damaged or invalid.',
      params: [
        {
          name: 'reason',
          type: 'select',
          required: false,
          options: CORRUPTION_REASON_OPTIONS,
          description: 'Filter by corruption reason'
        },
        {
          name: 'recoverable',
          type: 'boolean',
          required: false,
          description: 'Show only recoverable entities'
        },
        {
          name: 'session',
          type: 'session-id',
          required: false,
          description: 'Session ID (default: active)'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/corruption/list-corrupted' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          entities?: Array<{
            id: string;
            corruption_reason: string;
            corruption_date: number;
            recoverable: boolean;
          }>;
          total?: number;
          error?: string;
        };

        if (result.error) {
          return `❌ Error: ${result.error}`;
        }

        if (!result.entities || result.entities.length === 0) {
          return '✓ No corrupted entities found (this is good)';
        }

        let output = `⚠️  CORRUPTED ENTITIES: ${result.total || result.entities.length}\n\n`;
        output += '═══════════════════════════════════════\n\n';

        for (const entity of result.entities) {
          const recoverableIcon = entity.recoverable ? '🔧' : '❌';
          const age = Date.now() - entity.corruption_date;
          const ageStr = age > 86400000 ? `${Math.floor(age / 86400000)}d` : `${Math.floor(age / 3600000)}h`;

          output += `${recoverableIcon} ${entity.id}\n`;
          output += `   Reason: ${entity.corruption_reason}\n`;
          output += `   Age: ${ageStr} | Recoverable: ${entity.recoverable ? 'YES' : 'NO'}\n\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-rejection-realm',
      name: 'View Rejection Realm',
      description: 'See entities banished to rejection realms. These are artifacts too dangerous, powerful, or meta-breaking to remain in normal reality.',
      params: [
        {
          name: 'realm',
          type: 'select',
          required: false,
          options: REJECTION_REALM_OPTIONS,
          description: 'Filter by realm'
        },
        {
          name: 'dangerLevel',
          type: 'select',
          required: false,
          options: DANGER_LEVEL_OPTIONS,
          description: 'Filter by danger level'
        },
        {
          name: 'session',
          type: 'session-id',
          required: false,
          description: 'Session ID'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/corruption/list-rejected' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          artifacts?: Array<{
            id: string;
            rejection_reason: string;
            banished_to: string;
            danger_level: number;
            retrievable: boolean;
          }>;
          total?: number;
          error?: string;
        };

        if (result.error) {
          return `❌ Error: ${result.error}`;
        }

        if (!result.artifacts || result.artifacts.length === 0) {
          return '✓ No rejected artifacts found';
        }

        let output = `⚠️  REJECTED ARTIFACTS: ${result.total || result.artifacts.length}\n\n`;
        output += '═══════════════════════════════════════\n\n';

        for (const artifact of result.artifacts) {
          const dangerEmoji = artifact.danger_level >= 8 ? '💀' : artifact.danger_level >= 5 ? '⚠️' : '⚡';
          const retrievableIcon = artifact.retrievable ? '🔑' : '🔒';

          output += `${dangerEmoji} ${artifact.id}\n`;
          output += `   Realm: ${artifact.banished_to}\n`;
          output += `   Reason: ${artifact.rejection_reason}\n`;
          output += `   Danger: ${artifact.danger_level}/10 | Retrievable: ${retrievableIcon}\n\n`;
        }

        return output;
      },
    }),

    defineQuery({
      id: 'view-proto-realities',
      name: 'View Proto-Realities',
      description: 'See unstable/forming realities from before time was fully defined. These are universes from early development that failed to stabilize.',
      params: [
        {
          name: 'minStability',
          type: 'number',
          required: false,
          description: 'Minimum stability (0-100)'
        },
        {
          name: 'session',
          type: 'session-id',
          required: false,
          description: 'Session ID'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/corruption/list-proto-realities' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          realities?: Array<{
            id: string;
            era: string;
            stability: number;
            generation_error?: string;
            contains_primordial_artifacts: boolean;
          }>;
          total?: number;
          error?: string;
        };

        if (result.error) {
          return `❌ Error: ${result.error}`;
        }

        if (!result.realities || result.realities.length === 0) {
          return '✓ No proto-realities found';
        }

        let output = `🌀 PROTO-REALITIES: ${result.total || result.realities.length}\n\n`;
        output += '═══════════════════════════════════════\n';
        output += 'Universes from the time before time was invented.\n';
        output += 'Physics differs. Causality is negotiable.\n\n';

        for (const reality of result.realities) {
          const stabilityIcon = reality.stability > 50 ? '⚡' : reality.stability > 20 ? '🌀' : '💥';
          const artifactsIcon = reality.contains_primordial_artifacts ? '💎' : '　';

          output += `${stabilityIcon} ${reality.id}\n`;
          output += `   Era: ${reality.era}\n`;
          output += `   Stability: ${reality.stability}% ${artifactsIcon}\n`;
          if (reality.generation_error) {
            output += `   Error: ${reality.generation_error}\n`;
          }
          output += '\n';
        }

        return output;
      },
    }),

    defineQuery({
      id: 'get-corruption-details',
      name: 'Get Corruption Details',
      description: 'Get detailed information about why an entity was corrupted, including original data if available.',
      params: [
        {
          name: 'entityId',
          type: 'entity-id',
          required: true,
          description: 'Entity ID to inspect'
        },
        {
          name: 'session',
          type: 'session-id',
          required: false,
          description: 'Session ID'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/corruption/details' };
      },
    }),

    defineQuery({
      id: 'find-recoverable',
      name: 'Find Recoverable Entities',
      description: 'Find entities that might be recoverable through repair or purification.',
      params: [
        {
          name: 'maxAge',
          type: 'number',
          required: false,
          description: 'Max corruption age in hours (newer = easier to recover)'
        },
        {
          name: 'session',
          type: 'session-id',
          required: false,
          description: 'Session ID'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/corruption/find-recoverable' };
      },
    }),

    defineQuery({
      id: 'view-corruption-spread',
      name: 'View Corruption Spread',
      description: 'Check if corruption is spreading to nearby entities. Corruption can be contagious.',
      params: [
        {
          name: 'entityId',
          type: 'entity-id',
          required: true,
          description: 'Source entity ID'
        },
        {
          name: 'radius',
          type: 'number',
          required: false,
          default: 10,
          description: 'Check radius (tiles)'
        },
        {
          name: 'session',
          type: 'session-id',
          required: false,
          description: 'Session ID'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/corruption/check-spread' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          spreading?: boolean;
          affected_entities?: number;
          containment_recommended?: boolean;
          error?: string;
        };

        if (result.error) {
          return `❌ Error: ${result.error}`;
        }

        let output = '';
        if (result.spreading) {
          output += '🔴 WARNING: CORRUPTION IS SPREADING\n\n';
          output += `Affected entities: ${result.affected_entities || 0}\n`;
          if (result.containment_recommended) {
            output += '\n⚠️  IMMEDIATE QUARANTINE RECOMMENDED\n';
          }
        } else {
          output += '✓ Corruption contained (not spreading)\n';
        }

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'attempt-recovery',
      name: 'Attempt Recovery',
      description: 'Try to restore a corrupted entity. This is risky - recovery may fail or produce unexpected results.',
      params: [
        {
          name: 'entityId',
          type: 'entity-id',
          required: true,
          description: 'Entity to recover'
        },
        {
          name: 'fixerScript',
          type: 'string',
          required: false,
          description: 'Optional repair script name'
        },
        {
          name: 'acceptRisk',
          type: 'boolean',
          required: true,
          default: false,
          description: 'Confirm you understand recovery may fail or cause side effects'
        },
      ],
      requiresConfirmation: true,
      handler: async (params, gameClient, context) => {
        if (!params.acceptRisk) {
          return {
            success: false,
            message: 'Recovery aborted - risk not accepted. Corruption recovery is uncertain.'
          };
        }
        return { success: true, message: 'Delegate to /api/game/corruption/attempt-recovery' };
      },
    }),

    defineAction({
      id: 'quarantine-entity',
      name: 'Quarantine Entity',
      description: 'Isolate a corrupted entity to prevent corruption spread. This freezes the entity in stasis.',
      params: [
        {
          name: 'entityId',
          type: 'entity-id',
          required: true,
          description: 'Entity to quarantine'
        },
        {
          name: 'duration',
          type: 'number',
          required: false,
          description: 'Quarantine duration in hours (0 = indefinite)'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/corruption/quarantine' };
      },
    }),

    defineAction({
      id: 'purify',
      name: 'Divine Purification',
      description: 'Attempt divine purification to cleanse corruption. This is expensive and may fail. Requires divine power.',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        {
          name: 'entityId',
          type: 'entity-id',
          required: true,
          description: 'Entity to purify'
        },
        {
          name: 'intensity',
          type: 'select',
          required: true,
          options: [
            { value: 'gentle', label: 'Gentle (low cost, low success rate)' },
            { value: 'moderate', label: 'Moderate (medium cost, medium success)' },
            { value: 'intense', label: 'Intense (high cost, high success)' },
            { value: 'apocalyptic', label: 'Apocalyptic (extreme cost, guaranteed but destructive)' },
          ],
          description: 'Purification intensity'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/corruption/purify' };
      },
    }),

    defineAction({
      id: 'consign-to-void',
      name: 'Consign to the Void',
      description: 'Move entity to the deepest rejection realm. This is a last resort - retrieval is nearly impossible.',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        {
          name: 'entityId',
          type: 'entity-id',
          required: true,
          description: 'Entity to consign'
        },
        {
          name: 'reason',
          type: 'string',
          required: true,
          description: 'Justification for consignment to the void'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/corruption/consign-to-void' };
      },
    }),

    defineAction({
      id: 'stabilize-proto-reality',
      name: 'Stabilize Proto-Reality',
      description: 'Help a forming reality stabilize into a proper universe. This may succeed or cause further instability.',
      params: [
        {
          name: 'realityId',
          type: 'entity-id',
          required: true,
          description: 'Proto-reality to stabilize'
        },
        {
          name: 'method',
          type: 'select',
          required: true,
          options: [
            { value: 'gradual', label: 'Gradual (slow, safe)' },
            { value: 'forced', label: 'Forced (fast, risky)' },
            { value: 'guided', label: 'Guided (medium speed, medium risk)' },
          ],
          description: 'Stabilization method'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/corruption/stabilize-proto-reality' };
      },
    }),

    defineAction({
      id: 'merge-fragments',
      name: 'Merge Corrupted Fragments',
      description: 'Combine multiple corrupted fragments that might form a whole entity. This is experimental.',
      dangerous: true,
      params: [
        {
          name: 'fragmentIds',
          type: 'string',
          required: true,
          description: 'Comma-separated fragment entity IDs'
        },
        {
          name: 'targetType',
          type: 'string',
          required: false,
          description: 'Expected entity type after merge'
        },
      ],
      handler: async (params, gameClient, context) => {
        return { success: true, message: 'Delegate to /api/game/corruption/merge-fragments' };
      },
    }),
  ],
});

capabilityRegistry.register(corruptionCapability);
