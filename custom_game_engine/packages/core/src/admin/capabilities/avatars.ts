/**
 * Avatars Capability - Manage player avatar jack-in/jack-out system
 *
 * Provides admin interface for:
 * - Avatar entity roster and state inspection
 * - Agent avatar rosters
 * - Force jack-out (admin override)
 * - Force kill (triggers death + respawn flow)
 */

import { capabilityRegistry, defineCapability, defineQuery, defineAction } from '../CapabilityRegistry.js';

// ============================================================================
// Avatars Capability Definition
// ============================================================================

const avatarsCapability = defineCapability({
  id: 'avatars',
  name: 'Avatars',
  description: 'Manage player avatar jack-in/jack-out system, roster, and respawn',
  category: 'systems',

  tab: {
    icon: '👤',
    priority: 35,
  },

  queries: [
    defineQuery({
      id: 'list-avatars',
      name: 'List Avatars',
      description: 'Show all avatar entities and their current states',
      params: [],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        const game = (context as any).game;
        const world = game.world;
        const avatarEntities = world.query().with('avatar_entity').executeEntities();
        return avatarEntities.map((entity: any) => {
          const comp = entity.getComponent('avatar_entity');
          const pos = entity.getComponent('position');
          const health = entity.getComponent('health');
          return {
            entityId: entity.id,
            avatarId: comp?.avatarId ?? 'unknown',
            name: comp?.name ?? 'unknown',
            state: comp?.state ?? 'unknown',
            boundAgentId: comp?.boundAgentId ?? null,
            stance: comp?.stance ?? 'standing',
            position: pos ? { x: pos.x, y: pos.y } : null,
            health: health ? { current: health.current, max: health.max } : null,
            deathCount: comp?.deathCount ?? 0,
          };
        });
      },
    }),

    defineQuery({
      id: 'list-rosters',
      name: 'List Rosters',
      description: 'Show all agents with avatar rosters and their active avatars',
      params: [],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        const game = (context as any).game;
        const world = game.world;
        const rosterEntities = world.query().with('avatar_roster').executeEntities();
        return rosterEntities.map((entity: any) => {
          const roster = entity.getComponent('avatar_roster');
          return {
            agentEntityId: entity.id,
            agentId: roster?.agentId ?? 'unknown',
            avatarIds: roster?.avatarIds ?? [],
            activeAvatarId: roster?.activeAvatarId ?? null,
            maxAvatars: roster?.maxAvatars ?? 0,
            avatarCount: roster?.avatarIds?.length ?? 0,
          };
        });
      },
    }),

    defineQuery({
      id: 'avatar-detail',
      name: 'Avatar Detail',
      description: 'Show detailed information about a specific avatar entity',
      params: [
        { name: 'entityId', type: 'string' as const, description: 'Avatar entity ID', required: true },
      ],
      requiresGame: true,
      handler: async (params, gameClient, context) => {
        const game = (context as any).game;
        const world = game.world;
        const entity = world.getEntity(params.entityId as string);
        if (!entity) return { error: 'Entity not found' };
        const comp = entity.getComponent('avatar_entity');
        if (!comp) return { error: 'Entity has no avatar_entity component' };
        const pos = entity.getComponent('position');
        const health = entity.getComponent('health');
        return {
          entityId: entity.id,
          avatarId: comp.avatarId,
          name: comp.name,
          state: comp.state,
          boundAgentId: comp.boundAgentId,
          stance: comp.stance,
          species: comp.species ?? null,
          position: pos ? { x: pos.x, y: pos.y } : null,
          health: health ? { current: health.current, max: health.max } : null,
          deathCount: comp.deathCount,
          respawnPoint: comp.respawnPoint,
          createdAtTick: comp.createdAtTick,
          lastActiveTick: comp.lastActiveTick,
          lastEmote: comp.lastEmote,
          lastEmoteTick: comp.lastEmoteTick,
          appliedSkillBonuses: comp.appliedSkillBonuses ?? [],
          totalStats: comp.totalStats,
          sessionStats: comp.sessionStats,
          pendingRespawnOptions: comp.pendingRespawnOptions,
          autoRespawnDeadlineTick: comp.autoRespawnDeadlineTick,
        };
      },
    }),
  ],

  actions: [
    defineAction({
      id: 'force-jack-out',
      name: 'Force Jack Out',
      description: 'Force an agent to jack out of their avatar (admin override)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'entityId', type: 'string' as const, description: 'Avatar entity ID', required: true },
        { name: 'mode', type: 'select' as const, description: 'Jack-out mode', required: true, options: [
          { value: 'dormant', label: 'Dormant (keep in world)' },
          { value: 'suspended', label: 'Suspended (freeze)' },
          { value: 'despawn', label: 'Despawn (destroy)' },
        ]},
      ],
      handler: async (params, gameClient, context) => {
        const game = (context as any).game;
        const world = game.world;
        const avatarEntity = world.getEntity(params.entityId as string);
        if (!avatarEntity) return { success: false, error: 'Avatar entity not found' };
        const comp = avatarEntity.getComponent('avatar_entity');
        if (!comp) return { success: false, error: 'Entity has no avatar_entity component' };
        if (comp.state !== 'bound') return { success: false, error: `Avatar is not bound (state: ${comp.state})` };
        if (!comp.boundAgentId) return { success: false, error: 'Avatar has no bound agent' };

        const agentEntity = world.getEntity(comp.boundAgentId);
        if (!agentEntity) return { success: false, error: 'Bound agent entity not found' };

        const systems = game.gameLoop?.systems ?? [];
        const mgmtSystem = systems.find((s: any) => s.id === 'AvatarManagementSystem');
        if (!mgmtSystem) return { success: false, error: 'AvatarManagementSystem not found' };

        const result = (mgmtSystem as any).jackOut(agentEntity, params.mode as 'dormant' | 'suspended' | 'despawn', world);
        return result;
      },
    }),

    defineAction({
      id: 'force-kill-avatar',
      name: 'Force Kill Avatar',
      description: 'Force-kill an avatar (triggers death + respawn flow)',
      dangerous: true,
      requiresConfirmation: true,
      params: [
        { name: 'entityId', type: 'string' as const, description: 'Avatar entity ID', required: true },
        { name: 'cause', type: 'select' as const, description: 'Death cause', required: true, options: [
          { value: 'script', label: 'Script (admin kill)' },
          { value: 'combat', label: 'Combat' },
          { value: 'environmental', label: 'Environmental' },
        ]},
      ],
      handler: async (params, gameClient, context) => {
        const game = (context as any).game;
        const world = game.world;
        const avatarEntity = world.getEntity(params.entityId as string);
        if (!avatarEntity) return { success: false, error: 'Avatar entity not found' };
        const comp = avatarEntity.getComponent('avatar_entity');
        if (!comp) return { success: false, error: 'Entity has no avatar_entity component' };
        if (comp.state === 'destroyed') return { success: false, error: 'Avatar is already destroyed' };

        const systems = game.gameLoop?.systems ?? [];
        const respawnSystem = systems.find((s: any) => s.id === 'AvatarRespawnSystem');
        if (!respawnSystem) return { success: false, error: 'AvatarRespawnSystem not found' };

        const deathEvent = (respawnSystem as any).handleDeath(avatarEntity, params.cause as string, world);
        return { success: true, deathEvent };
      },
    }),
  ],
});

capabilityRegistry.register(avatarsCapability);
