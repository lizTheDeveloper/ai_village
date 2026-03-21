/**
 * SpellWorldEffectSystem — Drive 3: Empowerment of Creativity
 *
 * Subscribes to spell_sandbox:world_effect events emitted by the UI layer
 * when a player casts a spell with a worldEffect in the Research Casting Circle.
 *
 * Dispatches lightweight, reversible world effects based on the effect key:
 * - plant_tree: Create a tree at the player's camera center
 * - alter_weather: Trigger a short rain event
 * - create_fire: Set a tile to fire temporarily
 * - silence_area / reveal_hidden / others: No-op flavour (graceful)
 *
 * Task: MUL-2301
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import { createResourceComponent } from '../components/ResourceComponent.js';

/** Duration of fire tiles in ticks (3 seconds) */
const FIRE_DURATION_TICKS = 60;

/** Effect payload emitted by the UI layer */
interface SpellWorldEffectData {
  effect: string;
  spellTitle: string;
  verb: string;
  noun: string;
  x?: number;
  y?: number;
}

export class SpellWorldEffectSystem extends BaseSystem {
  public readonly id = 'spell_world_effect' as const;
  public readonly priority = 160;
  public readonly requiredComponents: string[] = [];
  public readonly activationComponents = ['agent'] as const;
  protected readonly throttleInterval = 0;

  /** Queued effects from event subscription, processed in onUpdate */
  private pendingEffects: SpellWorldEffectData[] = [];

  /** Pending fire removals: tick → [{x, y}] */
  private pendingFireRemovals: Map<number, Array<{ x: number; y: number }>> = new Map();

  /** Per-tick cache for Position+Renderable query (avoids repeated full scans) */
  private cachedRenderableEntities: ReadonlyArray<any> | null = null;
  private cachedRenderableTick = -1;

  protected onInitialize(): void {
    this.events.onGeneric('spell_sandbox:world_effect', (data: unknown) => {
      this.pendingEffects.push(data as SpellWorldEffectData);
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // Reset per-tick cache
    this.cachedRenderableEntities = null;

    const hasEffects = this.pendingEffects.length > 0;
    const removals = this.pendingFireRemovals.get(ctx.tick);

    // Early out — nothing to do this tick
    if (!hasEffects && !removals) return;

    // Process queued spell effects
    if (hasEffects) {
      for (const effectData of this.pendingEffects) {
        this.dispatchEffect(ctx, effectData);
      }
      this.pendingEffects.length = 0;
    }

    // Process pending fire removals
    if (removals) {
      for (const removal of removals) {
        this.removeFire(ctx, removal.x, removal.y);
      }
      this.pendingFireRemovals.delete(ctx.tick);
    }
  }

  private dispatchEffect(ctx: SystemContext, data: SpellWorldEffectData): void {
    switch (data.effect) {
      case 'plant_tree':
        this.handlePlantTree(ctx, data);
        break;
      case 'alter_weather':
        this.handleAlterWeather(ctx, data);
        break;
      case 'create_fire':
        this.handleCreateFire(ctx, data);
        break;
      case 'extinguish_fire':
        this.handleExtinguishFire(ctx, data);
        break;
      case 'heal_wound':
        this.handleHealWound(ctx, data);
        break;
      case 'silence_area':
      case 'reveal_hidden':
      case 'bind_entity':
      case 'summon_creature':
      case 'transform_object':
        // Flavour-only effects — no world mutation
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // Effect handlers
  // ---------------------------------------------------------------------------

  private handlePlantTree(ctx: SystemContext, data: SpellWorldEffectData): void {
    const x = data.x ?? 50;
    const y = data.y ?? 50;

    const tree = ctx.world.createEntity();
    ctx.world.addComponent(tree.id, createPositionComponent(x, y));
    ctx.world.addComponent(tree.id, createRenderableComponent('tree', 'entity'));
    ctx.world.addComponent(tree.id, createResourceComponent('wood', 5));

    this.events.emitGeneric('spell_sandbox:effect_applied', {
      effect: 'plant_tree',
      spellTitle: data.spellTitle,
      x,
      y,
      message: `A tree springs forth from the earth — ${data.spellTitle}`,
    });
  }

  private handleAlterWeather(ctx: SystemContext, data: SpellWorldEffectData): void {
    const weatherEntities = ctx.world.query().with(CT.Weather).executeEntities();
    if (weatherEntities.length === 0) return;

    const weatherEntity = weatherEntities[0]!;

    ctx.world.updateComponent(weatherEntity.id, CT.Weather, (current: any) => ({
      ...current,
      weatherType: 'rain',
      intensity: 0.7,
    }));

    ctx.emit('weather:changed', {
      weatherType: 'rain',
      intensity: 0.7,
      causedBy: data.spellTitle,
      divine: false,
    }, weatherEntity.id);

    this.events.emitGeneric('spell_sandbox:effect_applied', {
      effect: 'alter_weather',
      spellTitle: data.spellTitle,
      message: `Storm clouds gather — ${data.spellTitle} calls the rain`,
    });
  }

  private handleCreateFire(ctx: SystemContext, data: SpellWorldEffectData): void {
    const x = data.x ?? 50;
    const y = data.y ?? 50;

    const fire = ctx.world.createEntity();
    ctx.world.addComponent(fire.id, createPositionComponent(x, y));
    ctx.world.addComponent(fire.id, createRenderableComponent('fire', 'entity'));

    const removalTick = ctx.tick + FIRE_DURATION_TICKS;
    const removals = this.pendingFireRemovals.get(removalTick) ?? [];
    removals.push({ x, y });
    this.pendingFireRemovals.set(removalTick, removals);

    this.events.emitGeneric('spell_sandbox:effect_applied', {
      effect: 'create_fire',
      spellTitle: data.spellTitle,
      x,
      y,
      message: `Flames erupt from the earth — ${data.spellTitle}`,
    });
  }

  private handleExtinguishFire(ctx: SystemContext, data: SpellWorldEffectData): void {
    const x = data.x ?? 50;
    const y = data.y ?? 50;
    this.removeFireNear(ctx, x, y, 3, 'spell:extinguish_fire');

    this.events.emitGeneric('spell_sandbox:effect_applied', {
      effect: 'extinguish_fire',
      spellTitle: data.spellTitle,
      message: `The flames subside — ${data.spellTitle} brings peace`,
    });
  }

  private handleHealWound(ctx: SystemContext, data: SpellWorldEffectData): void {
    const x = data.x ?? 50;
    const y = data.y ?? 50;

    const nearest = ctx.getNearestEntity(
      { x, y },
      20,
      [CT.Position, CT.Needs]
    );

    if (nearest) {
      ctx.world.updateComponent(nearest.entity.id, CT.Needs, (current: any) => ({
        ...current,
        health: Math.min(1, ((current.health as number) ?? 0.5) + 0.3),
      }));

      const identity = nearest.entity.getComponent('identity') as { name?: string } | undefined;
      const name = identity?.name ?? 'an agent';

      this.events.emitGeneric('spell_sandbox:effect_applied', {
        effect: 'heal_wound',
        spellTitle: data.spellTitle,
        message: `Healing light washes over ${name} — ${data.spellTitle}`,
      });
    }
  }

  private removeFire(ctx: SystemContext, x: number, y: number): void {
    this.removeFireNear(ctx, x, y, 0, 'spell:fire_expired');
  }

  /**
   * Shared fire-removal helper. Queries renderable entities once and removes
   * fire sprites within `radius` tiles of (x, y).
   */
  private removeFireNear(ctx: SystemContext, x: number, y: number, radius: number, reason: string): void {
    // Use cached query from the GameLoop (entities with Position+Renderable)
    if (!this.cachedRenderableEntities || this.cachedRenderableTick !== ctx.tick) {
      this.cachedRenderableEntities = ctx.world.query().with(CT.Position).with(CT.Renderable).executeEntities();
      this.cachedRenderableTick = ctx.tick;
    }
    for (const entity of this.cachedRenderableEntities) {
      const pos = entity.getComponent(CT.Position) as { x: number; y: number } | undefined;
      const renderable = entity.getComponent(CT.Renderable) as { spriteId?: string } | undefined;
      if (!pos || !renderable) continue;
      if (renderable.spriteId === 'fire' && Math.abs(pos.x - x) <= radius && Math.abs(pos.y - y) <= radius) {
        ctx.world.destroyEntity(entity.id, reason);
      }
    }
  }
}
