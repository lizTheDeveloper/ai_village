/**
 * Memories Capability - Witness and influence the sacred realm of agent memories
 *
 * MYSTICAL POWER: The angel can perceive, surface, and shape memories themselves.
 * This is profoundly intimate and ethically complex - memories define identity,
 * carry trauma, and hold cherished moments.
 *
 * Framing:
 * - Memories = "the tapestry of lived experience"
 * - Traumatic memories = "wounds etched in consciousness"
 * - Cherished memories = "treasures of the heart"
 * - Forgotten memories = "fading echoes in the mist"
 * - False memories = "shadows that never were"
 * - Memory associations = "threads that bind experience"
 *
 * This capability lets the angel:
 * - View the full spectrum of an agent's memories
 * - Surface buried memories to consciousness
 * - Soothe traumatic memories (not erase - that would violate identity)
 * - Strengthen fading memories to preserve them
 * - Plant false memories (DANGEROUS, ethically fraught)
 * - Create connections between memories
 * - Share memories between agents (mystical empathy)
 *
 * Ethical considerations:
 * - Memories are identity - manipulation is profound
 * - Trauma should be soothed, not erased
 * - False memories violate autonomy and reality
 * - Shared memories can create deep bonds or confusion
 * - Every intervention is sacred and consequential
 *
 * Provides admin interface for:
 * - Viewing memories (episodic, semantic, spatial, procedural)
 * - Finding traumatic/cherished/forgotten memories
 * - Finding shared memories between agents
 * - Viewing memory associations and connections
 * - Surfacing, strengthening, and soothing memories
 * - Creating connections and sharing between agents
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Option Definitions
// ============================================================================

const MEMORY_TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'episodic', label: 'Episodic (events)' },
  { value: 'semantic', label: 'Semantic (facts/knowledge)' },
  { value: 'spatial', label: 'Spatial (places)' },
  { value: 'procedural', label: 'Procedural (skills/habits)' },
  { value: 'emotional', label: 'Emotional (feelings)' },
];

const EMOTIONAL_VALENCE_OPTIONS = [
  { value: 'positive', label: 'Positive (joy, love, triumph)' },
  { value: 'negative', label: 'Negative (pain, fear, loss)' },
  { value: 'mixed', label: 'Mixed (bittersweet)' },
  { value: 'neutral', label: 'Neutral' },
];

const MEMORY_STRENGTH_OPTIONS = [
  { value: 'vivid', label: 'Vivid (> 0.8)' },
  { value: 'clear', label: 'Clear (0.5-0.8)' },
  { value: 'fading', label: 'Fading (0.2-0.5)' },
  { value: 'dim', label: 'Dim (< 0.2)' },
];

// ============================================================================
// Memories Capability Definition
// ============================================================================

const memoriesCapability = defineCapability({
  id: 'memories',
  name: 'Memories & Consciousness',
  description: 'Witness and shape the sacred realm of agent memories - deeply personal and ethically complex',
  category: 'systems',

  tab: {
    icon: '🧠',
    priority: 4,
  },

  queries: [
    defineQuery({
      id: 'view-memories',
      name: 'View Agent Memories',
      description: 'See the full tapestry of an agent\'s memories',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to observe' },
        {
          name: 'type',
          type: 'select',
          required: false,
          options: MEMORY_TYPE_OPTIONS,
          description: 'Filter by memory type'
        },
        {
          name: 'strength',
          type: 'select',
          required: false,
          options: MEMORY_STRENGTH_OPTIONS,
          description: 'Filter by memory strength'
        },
        { name: 'limit', type: 'number', required: false, default: 20, description: 'Max memories to show' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/memories/view' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          totalMemories?: number;
          memories?: Array<{
            id: string;
            type: string;
            content: string;
            strength: number;
            importance: number;
            emotionalValence: number;
            tick: number;
            age?: string;
            associations?: string[];
          }>;
        };

        let output = `MEMORY TAPESTRY: ${result.agentName ?? 'Unknown'}\n`;
        output += `${'='.repeat(60)}\n\n`;
        output += `Total Memories: ${result.totalMemories ?? 0}\n\n`;

        if (!result.memories || result.memories.length === 0) {
          output += 'No memories found matching the criteria.\n';
          output += 'This soul may be newly awakened, or the filters exclude all memories.';
          return output;
        }

        result.memories.forEach((mem, idx) => {
          const strengthEmoji = mem.strength > 0.8 ? '✨' : mem.strength > 0.5 ? '○' : mem.strength > 0.2 ? '◌' : '·';
          const valenceEmoji = mem.emotionalValence > 0.3 ? '💛' : mem.emotionalValence < -0.3 ? '💔' : '🤍';

          output += `${idx + 1}. ${strengthEmoji} ${valenceEmoji} [${mem.type.toUpperCase()}]\n`;
          output += `   "${mem.content}"\n`;
          output += `   Strength: ${(mem.strength * 100).toFixed(0)}% | `;
          output += `Importance: ${(mem.importance * 100).toFixed(0)}% | `;
          output += `Age: ${mem.age ?? 'unknown'}\n`;

          if (mem.associations && mem.associations.length > 0) {
            output += `   Connected to: ${mem.associations.slice(0, 3).join(', ')}`;
            if (mem.associations.length > 3) {
              output += ` (+${mem.associations.length - 3} more)`;
            }
            output += '\n';
          }

          output += '\n';
        });

        return output;
      },
    }),

    defineQuery({
      id: 'view-traumatic-memories',
      name: 'View Traumatic Memories',
      description: 'Find memories that carry pain and trauma - wounds etched in consciousness',
      params: [
        { name: 'agentId', type: 'entity-id', required: false, entityType: 'agent', description: 'Specific agent (or all)' },
        { name: 'minIntensity', type: 'number', required: false, default: 0.6, description: 'Min trauma intensity (0-1)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/memories/traumatic' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          traumas?: Array<{
            agentId: string;
            agentName: string;
            memoryId: string;
            content: string;
            traumaIntensity: number;
            age: string;
            hasBeenProcessed: boolean;
          }>;
        };

        let output = 'TRAUMATIC MEMORIES - WOUNDS OF CONSCIOUSNESS\n';
        output += `${'='.repeat(60)}\n\n`;

        if (!result.traumas || result.traumas.length === 0) {
          output += 'No significant trauma detected.\n';
          output += 'These souls carry their pain lightly, or have healed well.';
          return output;
        }

        output += `${result.traumas.length} traumatic memories found:\n\n`;

        result.traumas.forEach(trauma => {
          const intensity = (trauma.traumaIntensity * 100).toFixed(0);
          const processedMark = trauma.hasBeenProcessed ? '(processed)' : '(raw)';

          output += `💔 ${trauma.agentName} ${processedMark}\n`;
          output += `   Intensity: ${intensity}% | Age: ${trauma.age}\n`;
          output += `   "${trauma.content}"\n\n`;
        });

        output += 'These memories may be soothed but should not be erased -\n';
        output += 'they are part of who these souls have become.';

        return output;
      },
    }),

    defineQuery({
      id: 'view-cherished-memories',
      name: 'View Cherished Memories',
      description: 'Find the most treasured memories - jewels of the heart',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to observe' },
        { name: 'limit', type: 'number', required: false, default: 10, description: 'Number to retrieve' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/memories/cherished' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          cherished?: Array<{
            memoryId: string;
            content: string;
            joy: number;
            importance: number;
            age: string;
            involvedAgents?: string[];
          }>;
        };

        let output = `CHERISHED MEMORIES: ${result.agentName ?? 'Unknown'}\n`;
        output += `${'='.repeat(60)}\n`;
        output += 'The treasures this soul holds dear:\n\n';

        if (!result.cherished || result.cherished.length === 0) {
          output += 'No particularly cherished memories found.\n';
          output += 'Perhaps this soul has not yet experienced moments\n';
          output += 'worthy of deep attachment, or they fade too quickly.';
          return output;
        }

        result.cherished.forEach((mem, idx) => {
          const joyLevel = (mem.joy * 100).toFixed(0);

          output += `${idx + 1}. 💛 "${mem.content}"\n`;
          output += `   Joy: ${joyLevel}% | Importance: ${(mem.importance * 100).toFixed(0)}%\n`;
          output += `   Age: ${mem.age}\n`;

          if (mem.involvedAgents && mem.involvedAgents.length > 0) {
            output += `   Shared with: ${mem.involvedAgents.join(', ')}\n`;
          }

          output += '\n';
        });

        return output;
      },
    }),

    defineQuery({
      id: 'find-shared-memories',
      name: 'Find Shared Memories',
      description: 'Find memories of the same event experienced by different agents',
      params: [
        { name: 'agentId1', type: 'entity-id', required: true, entityType: 'agent', description: 'First agent' },
        { name: 'agentId2', type: 'entity-id', required: false, entityType: 'agent', description: 'Second agent (or all)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/memories/shared' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agent1Name?: string;
          agent2Name?: string;
          sharedEvents?: Array<{
            tick: number;
            age: string;
            agent1Memory: string;
            agent2Memory: string;
            agent1Emotion: number;
            agent2Emotion: number;
            similarity: number;
          }>;
        };

        let output = 'SHARED MEMORIES\n';
        output += `${result.agent1Name ?? 'Agent 1'} and ${result.agent2Name ?? 'Agent 2'}\n`;
        output += `${'='.repeat(60)}\n\n`;

        if (!result.sharedEvents || result.sharedEvents.length === 0) {
          output += 'No shared memories found.\n';
          output += 'These souls have not yet witnessed the same moments,\n';
          output += 'or remember them so differently they do not connect.';
          return output;
        }

        output += `${result.sharedEvents.length} shared experiences found:\n\n`;

        result.sharedEvents.forEach((event, idx) => {
          output += `${idx + 1}. SHARED EVENT (${event.age} ago)\n`;
          output += `   Similarity: ${(event.similarity * 100).toFixed(0)}%\n\n`;

          const emoji1 = event.agent1Emotion > 0.3 ? '💛' : event.agent1Emotion < -0.3 ? '💔' : '🤍';
          const emoji2 = event.agent2Emotion > 0.3 ? '💛' : event.agent2Emotion < -0.3 ? '💔' : '🤍';

          output += `   ${emoji1} ${result.agent1Name ?? 'Agent 1'}:\n`;
          output += `      "${event.agent1Memory}"\n\n`;

          output += `   ${emoji2} ${result.agent2Name ?? 'Agent 2'}:\n`;
          output += `      "${event.agent2Memory}"\n\n`;
        });

        return output;
      },
    }),

    defineQuery({
      id: 'view-forgotten',
      name: 'View Fading Memories',
      description: 'See memories that are slipping away into the mist of forgetfulness',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to examine' },
        { name: 'maxStrength', type: 'number', required: false, default: 0.2, description: 'Max strength (0-1)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/memories/fading' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          fading?: Array<{
            memoryId: string;
            content: string;
            strength: number;
            importance: number;
            age: string;
            timeUntilLost?: string;
          }>;
        };

        let output = `FADING MEMORIES: ${result.agentName ?? 'Unknown'}\n`;
        output += `${'='.repeat(60)}\n`;
        output += 'Echoes slipping into the mist:\n\n';

        if (!result.fading || result.fading.length === 0) {
          output += 'No memories are fading.\n';
          output += 'This soul holds their experiences firmly,\n';
          output += 'or has already forgotten what was meant to fade.';
          return output;
        }

        result.fading.forEach((mem, idx) => {
          const strength = (mem.strength * 100).toFixed(0);

          output += `${idx + 1}. · "${mem.content}"\n`;
          output += `   Strength: ${strength}% (fading) | Age: ${mem.age}\n`;

          if (mem.timeUntilLost) {
            output += `   Will be lost in: ${mem.timeUntilLost}\n`;
          }

          output += '\n';
        });

        output += 'These memories may be strengthened to preserve them,\n';
        output += 'or allowed to fade as nature intended.';

        return output;
      },
    }),

    defineQuery({
      id: 'view-memory-associations',
      name: 'View Memory Associations',
      description: 'See how memories connect to each other - the web of consciousness',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to examine' },
        { name: 'memoryId', type: 'string', required: false, description: 'Specific memory (or strongest)' },
        { name: 'depth', type: 'number', required: false, default: 2, description: 'Association depth (1-3)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        return { message: 'Delegate to /api/game/memories/associations' };
      },
      renderResult: (data: unknown) => {
        const result = data as {
          agentName?: string;
          rootMemory?: {
            id: string;
            content: string;
            strength: number;
          };
          associations?: Array<{
            depth: number;
            memoryId: string;
            content: string;
            associationType: string;
            connectionStrength: number;
          }>;
        };

        let output = `MEMORY ASSOCIATIONS: ${result.agentName ?? 'Unknown'}\n`;
        output += `${'='.repeat(60)}\n\n`;

        if (!result.rootMemory) {
          output += 'Root memory not found.';
          return output;
        }

        output += `ROOT MEMORY:\n`;
        output += `"${result.rootMemory.content}"\n`;
        output += `(strength: ${(result.rootMemory.strength * 100).toFixed(0)}%)\n\n`;

        if (!result.associations || result.associations.length === 0) {
          output += 'This memory stands alone - no associations found.';
          return output;
        }

        output += 'CONNECTED MEMORIES:\n';
        const byDepth = new Map<number, typeof result.associations>();

        result.associations.forEach(assoc => {
          const list = byDepth.get(assoc.depth) || [];
          list.push(assoc);
          byDepth.set(assoc.depth, list);
        });

        Array.from(byDepth.keys()).sort().forEach(depth => {
          const assocs = byDepth.get(depth)!;
          const indent = '  '.repeat(depth);

          output += `\n${indent}[Depth ${depth}]\n`;

          assocs.forEach(assoc => {
            const strength = (assoc.connectionStrength * 100).toFixed(0);
            output += `${indent}├─ (${assoc.associationType}, ${strength}%)\n`;
            output += `${indent}   "${assoc.content}"\n`;
          });
        });

        return output;
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'surface-memory',
      name: 'Surface Buried Memory',
      description: 'Bring a buried memory back to consciousness - make it vivid again',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to affect' },
        { name: 'memoryId', type: 'string', required: true, description: 'Memory ID to surface' },
        { name: 'intensity', type: 'number', required: false, default: 0.7, description: 'How vividly to surface (0.3-1.0)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        const intensity = Math.min(1.0, Math.max(0.3, typeof params.intensity === 'number' ? params.intensity : 0.7));

        return {
          success: true,
          message: `Memory surfaced in ${params.agentId} with ${(intensity * 100).toFixed(0)}% intensity. ` +
                   `It rises from the depths of consciousness, becoming vivid once more.`
        };
      },
    }),

    defineAction({
      id: 'soothe-trauma',
      name: 'Soothe Traumatic Memory',
      description: 'Ease the pain of a traumatic memory without erasing it - healing not forgetting',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to heal' },
        { name: 'memoryId', type: 'string', required: true, description: 'Traumatic memory to soothe' },
        { name: 'soothing', type: 'number', required: false, default: 0.5, description: 'Soothing strength (0.2-0.8)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        const soothing = Math.min(0.8, Math.max(0.2, typeof params.soothing === 'number' ? params.soothing : 0.5));

        return {
          success: true,
          message: `Trauma soothed in ${params.agentId} by ${(soothing * 100).toFixed(0)}%. ` +
                   `The memory remains, but its sharp edges have been softened. ` +
                   `The pain is gentler now, though the experience is still part of them.`
        };
      },
    }),

    defineAction({
      id: 'strengthen-memory',
      name: 'Strengthen Memory',
      description: 'Make a memory more vivid and lasting - preserve it from fading',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to affect' },
        { name: 'memoryId', type: 'string', required: true, description: 'Memory to strengthen' },
        { name: 'boost', type: 'number', required: false, default: 0.3, description: 'Strength boost (0.1-0.5)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        const boost = Math.min(0.5, Math.max(0.1, typeof params.boost === 'number' ? params.boost : 0.3));

        return {
          success: true,
          message: `Memory strengthened in ${params.agentId} by +${(boost * 100).toFixed(0)}%. ` +
                   `It shines more brightly now, preserved from the mist of forgetfulness.`
        };
      },
    }),

    defineAction({
      id: 'plant-false-memory',
      name: 'Plant False Memory',
      description: 'Create a memory of something that never happened - VERY DANGEROUS AND ETHICALLY FRAUGHT',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to implant into' },
        { name: 'content', type: 'string', required: true, description: 'The false memory content' },
        { name: 'strength', type: 'number', required: false, default: 0.5, description: 'Initial strength (0.3-0.8)' },
        { name: 'emotionalValence', type: 'number', required: false, default: 0, description: 'Emotion (-1 to 1)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        const strength = Math.min(0.8, Math.max(0.3, typeof params.strength === 'number' ? params.strength : 0.5));

        return {
          success: true,
          message: `⚠️  FALSE MEMORY PLANTED in ${params.agentId}\n\n` +
                   `Content: "${params.content}"\n` +
                   `Strength: ${(strength * 100).toFixed(0)}%\n\n` +
                   `This is a profound violation of reality and autonomy.\n` +
                   `The agent now remembers something that never happened.\n` +
                   `This may have unpredictable consequences for their identity and behavior.`
        };
      },
    }),

    defineAction({
      id: 'connect-memories',
      name: 'Connect Memories',
      description: 'Create an association between two memories - forge new neural pathways',
      params: [
        { name: 'agentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Agent to affect' },
        { name: 'memoryId1', type: 'string', required: true, description: 'First memory' },
        { name: 'memoryId2', type: 'string', required: true, description: 'Second memory' },
        { name: 'associationType', type: 'string', required: false, default: 'thematic', description: 'Type of connection' },
        { name: 'strength', type: 'number', required: false, default: 0.5, description: 'Connection strength (0.1-1.0)' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        const strength = Math.min(1.0, Math.max(0.1, typeof params.strength === 'number' ? params.strength : 0.5));

        return {
          success: true,
          message: `Memories connected in ${params.agentId} with ${(strength * 100).toFixed(0)}% strength.\n` +
                   `Association type: ${params.associationType}\n` +
                   `When one memory is recalled, the other may now surface as well.`
        };
      },
    }),

    defineAction({
      id: 'share-memory-between-agents',
      name: 'Share Memory Between Agents',
      description: 'Let one agent "remember" another\'s experience - mystical empathy',
      dangerous: true,
      params: [
        { name: 'sourceAgentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Source of memory' },
        { name: 'targetAgentId', type: 'entity-id', required: true, entityType: 'agent', description: 'Recipient of memory' },
        { name: 'memoryId', type: 'string', required: true, description: 'Memory to share' },
        { name: 'clarity', type: 'number', required: false, default: 0.6, description: 'How clear the shared memory is (0.3-1.0)' },
        { name: 'markAsShared', type: 'boolean', required: false, default: true, description: 'Mark as "not my memory"?' },
        { name: 'session', type: 'session-id', required: false, description: 'Session ID' },
      ],
      handler: async (params, gameClient, context) => {
        if (!gameClient) {
          return { success: false, error: 'No game connected' };
        }

        const clarity = Math.min(1.0, Math.max(0.3, typeof params.clarity === 'number' ? params.clarity : 0.6));

        let message = `Memory shared from ${params.sourceAgentId} to ${params.targetAgentId}.\n`;
        message += `Clarity: ${(clarity * 100).toFixed(0)}%\n\n`;

        if (params.markAsShared) {
          message += `The recipient knows this is not their own memory - `;
          message += `they experience it as if seeing through another's eyes.`;
        } else {
          message += `⚠️  The recipient believes this is their own memory.\n`;
          message += `This may cause confusion about their own identity and past.`;
        }

        return { success: true, message };
      },
    }),
  ],
});

capabilityRegistry.register(memoriesCapability);
