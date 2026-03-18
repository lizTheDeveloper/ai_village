/**
 * AnimalMigrationSystem - Seasonal animal migration between biomes
 *
 * Drives animals to migrate between biome pairs based on season:
 * - Birds (robin, swallow, finch species) migrate forest → plains in fall/winter,
 *   return in spring.
 * - Ungulates (deer, bison, elk species) migrate mountains → plains in winter,
 *   return in spring.
 *
 * On season change: evaluates wild animals, adds AnimalMigrationComponent to
 * those that should migrate.
 *
 * Each tick: moves migrating animals toward destination, removes component
 * when they arrive.
 *
 * Priority: 25 (after AnimalBrainSystem 12, AnimalSystem 15)
 * Throttle: 100 ticks (~5 seconds)
 */
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import type { AnimalState } from '../types/AnimalTypes.js';
import type { TimeComponent } from './TimeSystem.js';
import {
  createAnimalMigrationComponent,
  type AnimalMigrationComponent,
} from '../components/AnimalMigrationComponent.js';

// ============================================================================
// Migration Rules
// ============================================================================

const MIGRATORY_BIRD_SPECIES = ['robin', 'swallow', 'finch', 'sparrow', 'warbler', 'thrush'];
const MIGRATORY_UNGULATE_SPECIES = ['deer', 'bison', 'elk', 'caribou', 'reindeer', 'moose'];

type MigrationRule = {
  speciesPatterns: string[];
  fromBiome: string;
  toBiome: string;
  triggerSeasons: string[];
  returnSeasons: string[];
};

const MIGRATION_RULES: MigrationRule[] = [
  {
    speciesPatterns: MIGRATORY_BIRD_SPECIES,
    fromBiome: 'forest',
    toBiome: 'plains',
    triggerSeasons: ['fall', 'winter'],
    returnSeasons: ['spring'],
  },
  {
    speciesPatterns: MIGRATORY_UNGULATE_SPECIES,
    fromBiome: 'mountains',
    toBiome: 'plains',
    triggerSeasons: ['winter'],
    returnSeasons: ['spring', 'summer'],
  },
];

// ============================================================================
// AnimalMigrationSystem
// ============================================================================

export class AnimalMigrationSystem extends BaseSystem {
  public readonly id: SystemId = 'animal_migration';
  public readonly priority: number = 25;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Animal];
  public readonly activationComponents = [CT.Animal] as const;
  protected readonly throttleInterval = 100;

  private lastSeason: string | null = null;
  private pendingSeasonChange: string | null = null;
  private timeEntityId: string | null = null;

  private readonly MIGRATION_SPEED = 2.0;
  private readonly ARRIVAL_DISTANCE_SQ = 100;

  protected onInitialize(_world: World, eventBus: EventBus): void {
    eventBus.on('time:season_change', (event) => {
      // event is a GameEvent<'time:season_change'>; event.data.newSeason is the new season
      this.pendingSeasonChange = event.data.newSeason;
    });
  }

  protected onUpdate(ctx: SystemContext): void {
    // If season changed, evaluate all wild animals for migration
    if (
      this.pendingSeasonChange !== null &&
      this.pendingSeasonChange !== this.lastSeason
    ) {
      this.evaluateMigration(ctx.world, ctx.activeEntities, this.pendingSeasonChange);
      this.lastSeason = this.pendingSeasonChange;
      this.pendingSeasonChange = null;
    }

    // Move migrating animals toward destination
    // Cache query before loop per CLAUDE.md performance guidelines
    const migratingEntities = ctx.world
      .query()
      .with(CT.Animal)
      .with(CT.AnimalMigration)
      .executeEntities();

    for (const entity of migratingEntities) {
      this.updateMigration(entity, ctx.world);
    }
  }

  /**
   * Evaluate all wild animals to determine if they should start migrating this season.
   */
  private evaluateMigration(
    world: World,
    entities: ReadonlyArray<EntityImpl>,
    season: string,
  ): void {
    for (const entity of entities) {
      const impl = entity as EntityImpl;
      const animal = impl.getComponent<AnimalComponent>(CT.Animal);
      if (!animal || !animal.wild) continue;

      // Skip if already migrating
      if (impl.getComponent(CT.AnimalMigration)) continue;

      const speciesLower = animal.speciesId.toLowerCase();
      const currentBiome = typeof world.getTileAt === 'function'
        ? world.getTileAt(
            Math.floor(animal.position.x),
            Math.floor(animal.position.y)
          )?.biome ?? 'plains'
        : 'plains';

      for (const rule of MIGRATION_RULES) {
        const matchesSpecies = rule.speciesPatterns.some((p) => speciesLower.includes(p));
        if (!matchesSpecies) continue;

        // Check trigger migration
        if (rule.fromBiome === currentBiome && rule.triggerSeasons.includes(season)) {
          const dest = this.calculateMigrationDestination(
            animal.position.x,
            animal.position.y,
            rule.fromBiome,
            rule.toBiome,
          );
          impl.addComponent(
            createAnimalMigrationComponent(
              rule.toBiome,
              dest.x,
              dest.y,
              season,
              this.getCurrentDay(world),
            ),
          );
          world.eventBus.emit({
            type: 'animal:migration_started',
            source: entity.id,
            data: {
              animalId: animal.id,
              speciesId: animal.speciesId,
              fromBiome: rule.fromBiome,
              toBiome: rule.toBiome,
              season,
            },
          });
          break;
        }

        // Check return migration
        if (rule.toBiome === currentBiome && rule.returnSeasons.includes(season)) {
          const dest = this.calculateMigrationDestination(
            animal.position.x,
            animal.position.y,
            rule.toBiome,
            rule.fromBiome,
          );
          impl.addComponent(
            createAnimalMigrationComponent(
              rule.fromBiome,
              dest.x,
              dest.y,
              season,
              this.getCurrentDay(world),
            ),
          );
          world.eventBus.emit({
            type: 'animal:migration_started',
            source: entity.id,
            data: {
              animalId: animal.id,
              speciesId: animal.speciesId,
              fromBiome: rule.toBiome,
              toBiome: rule.fromBiome,
              season,
            },
          });
          break;
        }
      }
    }
  }

  /**
   * Move a migrating animal toward its destination; remove migration component on arrival.
   */
  private updateMigration(entity: Entity, world: World): void {
    const impl = entity as EntityImpl;
    const animal = impl.getComponent<AnimalComponent>(CT.Animal);
    const migration = impl.getComponent<AnimalMigrationComponent>(CT.AnimalMigration);

    if (!animal || !migration) return;

    const dx = migration.targetX - animal.position.x;
    const dy = migration.targetY - animal.position.y;
    const distSq = dx * dx + dy * dy;

    if (distSq <= this.ARRIVAL_DISTANCE_SQ) {
      // Arrived - remove migration component
      impl.removeComponent(CT.AnimalMigration);
      world.eventBus.emit({
        type: 'animal:migration_completed',
        source: entity.id,
        data: {
          animalId: animal.id,
          speciesId: animal.speciesId,
          biome: migration.targetBiome,
        },
      });
      return;
    }

    // Move toward destination
    const dist = Math.sqrt(distSq); // sqrt is fine here - not in a hot inner loop
    const normX = dx / dist;
    const normY = dy / dist;

    const newX = animal.position.x + normX * this.MIGRATION_SPEED;
    const newY = animal.position.y + normY * this.MIGRATION_SPEED;

    // Calculate progress as fraction of original distance covered
    const newDx = migration.targetX - newX;
    const newDy = migration.targetY - newY;
    const newDistSq = newDx * newDx + newDy * newDy;
    // Use initial position to compute original distance (approximated from current + movement)
    const origDistApprox = dist + this.MIGRATION_SPEED;
    const newProgress = Math.min(1, Math.max(0, 1 - Math.sqrt(newDistSq) / origDistApprox));

    // Update animal position and set state to idle (overrides brain behavior during migration)
    impl.updateComponent<AnimalComponent>(CT.Animal, (current) => ({
      ...current,
      position: { x: newX, y: newY },
      state: 'idle' as AnimalState,
      isDomesticated: current.isDomesticated,
    }));

    // Update migration progress
    impl.updateComponent<AnimalMigrationComponent>(CT.AnimalMigration, (current) => ({
      ...current,
      progress: Math.min(1, Math.max(0, newProgress)),
    }));
  }

  /**
   * Calculate the world-space destination for a migration.
   */
  private calculateMigrationDestination(
    currentX: number,
    currentY: number,
    fromBiome: string,
    toBiome: string,
  ): { x: number; y: number } {
    const spread = 50;
    const offsetX = (Math.random() - 0.5) * spread;
    const offsetY = (Math.random() - 0.5) * spread;

    if (fromBiome === 'forest' && toBiome === 'plains') {
      // Birds fly south (toward warmer plains)
      return { x: currentX + offsetX, y: currentY + 250 + offsetY };
    }
    if (fromBiome === 'mountains' && toBiome === 'plains') {
      // Ungulates descend toward lowlands (move toward origin)
      const dirX = currentX > 0 ? -1 : 1;
      const dirY = currentY > 0 ? -1 : 1;
      return { x: currentX + dirX * 250 + offsetX, y: currentY + dirY * 200 + offsetY };
    }
    // Return migration (spring) - move back roughly toward origin
    return { x: currentX * 0.5 + offsetX, y: currentY * 0.5 + offsetY };
  }

  /**
   * Get the current day from the cached TimeComponent singleton.
   */
  private getCurrentDay(world: World): number {
    if (!this.timeEntityId) {
      const timeEntities = world.query().with(CT.Time).executeEntities();
      if (timeEntities.length > 0) {
        this.timeEntityId = timeEntities[0]!.id;
      }
    }

    if (this.timeEntityId) {
      const timeEntity = world.getEntity(this.timeEntityId);
      if (timeEntity) {
        const timeComp = (timeEntity as EntityImpl).getComponent<TimeComponent>(CT.Time);
        return timeComp?.day ?? 1;
      } else {
        this.timeEntityId = null;
      }
    }

    return 1;
  }
}
