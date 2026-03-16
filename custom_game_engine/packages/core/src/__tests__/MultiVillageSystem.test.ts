/**
 * MultiVillageSystem tests
 *
 * Covers:
 * - VillageSummarySystem aggregates population correctly
 * - InterVillageCaravanSystem spawns and moves caravans
 * - Caravan arrives and updates village resources
 * - NewsPropagationSystem propagates news with distance-based delay
 * - Village status transitions (thriving -> struggling -> collapsed)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorldImpl } from '../ecs/index.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { EventBusImpl } from '../events/EventBus.js';
import { VillageSummarySystem } from '../systems/VillageSummarySystem.js';
import { InterVillageCaravanSystem } from '../systems/InterVillageCaravanSystem.js';
import { NewsPropagationSystem } from '../systems/NewsPropagationSystem.js';
import { createVillageComponent } from '../components/VillageComponent.js';
import type { VillageComponent } from '../components/VillageComponent.js';
import { createTradeRouteComponent } from '../components/TradeRouteComponent.js';
import type { TradeRouteComponent } from '../components/TradeRouteComponent.js';
import {
  createInterVillageCaravanComponent,
  type InterVillageCaravanComponent,
} from '../components/InterVillageCaravanComponent.js';
import { createNewsItem } from '../types/NewsItem.js';
import { ComponentType as CT } from '../types/ComponentType.js';

// ============================================================
// Helpers
// ============================================================

function createWorld() {
  const eventBus = new EventBusImpl();
  const world = new WorldImpl(eventBus);
  return { world, eventBus };
}

function createVillageEntity(
  world: WorldImpl,
  villageId: string,
  name: string,
  position: { x: number; y: number },
  abstractionLevel: VillageComponent['abstractionLevel'] = 'summary'
): EntityImpl {
  const entity = world.createEntity() as EntityImpl;
  entity.addComponent(createVillageComponent(villageId, name, position, abstractionLevel, 0));
  return entity;
}

function createAgentEntity(
  world: WorldImpl,
  position: { x: number; y: number },
  mood = 50 // -100 to 100
): EntityImpl {
  const entity = world.createEntity() as EntityImpl;
  entity.addComponent({ type: 'position', version: 1, x: position.x, y: position.y } as any);
  entity.addComponent({ type: 'agent', version: 1 } as any);
  entity.addComponent({
    type: 'mood', version: 1,
    currentMood: mood, baselineMood: mood,
    factors: {}, emotionalState: 'neutral',
    moodHistory: [], recentMeals: [], favorites: [], comfortFoods: [],
  } as any);
  entity.addComponent({
    type: 'inventory', version: 1,
    slots: [{ itemId: 'food', quantity: 10 }],
    maxSlots: 24, maxWeight: 100, currentWeight: 10,
  } as any);
  return entity;
}

/**
 * Run a system update with a specific tick, then flush events.
 * The throttleInterval for summary/caravan/news systems is 200/100/300.
 * We set tick to a multiple so throttle allows the run.
 */
function runSystemAt(
  world: WorldImpl,
  eventBus: EventBusImpl,
  system: { update: (w: any, e: any[], d: number) => void },
  tick: number,
  deltaTime = 1
): void {
  (world as any)._tick = tick;
  const entities = world.query().executeEntities();
  system.update(world as any, entities, deltaTime);
  eventBus.flush();
}

// ============================================================
// Tests
// ============================================================

describe('VillageSummarySystem', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let system: VillageSummarySystem;

  beforeEach(async () => {
    ({ world, eventBus } = createWorld());
    system = new VillageSummarySystem();
    await system.initialize(world as any, eventBus);
  });

  it('has correct id and priority', () => {
    expect(system.id).toBe('village_summary');
    expect(system.priority).toBe(195);
  });

  it('requires village component', () => {
    expect(system.requiredComponents).toContain(CT.Village);
  });

  it('does not aggregate detailed villages', () => {
    const detailedVillage = createVillageEntity(world, 'v3', 'Main Village', { x: 0, y: 0 }, 'detailed');
    createAgentEntity(world, { x: 5, y: 5 });

    // Throttle interval is 200, run at tick 200
    runSystemAt(world, eventBus, system, 200);

    const updated = detailedVillage.getComponent<VillageComponent>('village');
    // Should remain at default population 0 since we skip detailed villages
    expect(updated!.summary.population).toBe(0);
  });

  it('aggregates population from nearby agents for summary villages', () => {
    const villageEntity = createVillageEntity(world, 'v1', 'TestVillage', { x: 100, y: 100 }, 'summary');

    // Spawn 5 agents near the village (within VILLAGE_AGENT_SCAN_RADIUS = 150)
    for (let i = 0; i < 5; i++) {
      createAgentEntity(world, { x: 100 + i * 10, y: 100 });
    }

    runSystemAt(world, eventBus, system, 200);

    const updated = villageEntity.getComponent<VillageComponent>('village');
    expect(updated).toBeDefined();
    expect(updated!.summary.population).toBe(5);
  });

  it('transitions status to collapsed when no agents nearby', () => {
    const villageEntity = createVillageEntity(world, 'v_ghost', 'Ghost Town', { x: 500, y: 500 }, 'summary');
    // No agents anywhere near x=500, y=500

    runSystemAt(world, eventBus, system, 200);

    const updated = villageEntity.getComponent<VillageComponent>('village');
    expect(updated!.status).toBe('collapsed');
  });

  it('transitions status to thriving with large population and resources', () => {
    // Test the private computeStatus method directly
    const computeStatus = (system as any).computeStatus.bind(system);

    expect(computeStatus(25, 200, 'stable')).toBe('thriving');
    expect(computeStatus(3, 5, 'stable')).toBe('struggling');
    expect(computeStatus(0, 0, 'stable')).toBe('collapsed');
    expect(computeStatus(0, 0, 'collapsed')).toBe('ruins');
    expect(computeStatus(10, 50, 'ruins')).toBe('ruins'); // ruins is permanent
  });

  it('emits village:status_changed when status transitions', () => {
    const statusChangedHandler = vi.fn();
    eventBus.subscribe('village:status_changed', statusChangedHandler);

    // Village far from any agents => should collapse
    createVillageEntity(world, 'v2', 'Dying Village', { x: 9999, y: 9999 }, 'summary');

    runSystemAt(world, eventBus, system, 200);

    expect(statusChangedHandler).toHaveBeenCalledOnce();
    const event = statusChangedHandler.mock.calls[0][0];
    expect(event.data.villageId).toBe('v2');
    expect(event.data.newStatus).toBe('collapsed');
    expect(event.data.oldStatus).toBe('stable');
  });
});

describe('InterVillageCaravanSystem', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let system: InterVillageCaravanSystem;

  beforeEach(async () => {
    ({ world, eventBus } = createWorld());
    system = new InterVillageCaravanSystem();
    await system.initialize(world as any, eventBus);
  });

  it('has correct id and priority', () => {
    expect(system.id).toBe('inter_village_caravan');
    expect(system.priority).toBe(190);
  });

  it('spawns a caravan when route interval elapses', () => {
    const routeEntity = world.createEntity() as EntityImpl;
    // lastCaravanTick=0, caravanIntervalTicks=50, tick=100 => interval exceeded
    routeEntity.addComponent({
      ...createTradeRouteComponent('route1', 'src_v', 'tgt_v', 100, 50),
      lastCaravanTick: 0,
      agreement: {
        exports: [{ resourceType: 'food', amountPerTrip: 20 }],
        imports: [],
      },
    });

    // Throttle is 100 ticks
    runSystemAt(world, eventBus, system, 100);

    const caravans = world.query().with(CT.InterVillageCaravan as any).executeEntities();
    expect(caravans.length).toBeGreaterThan(0);

    const caravan = caravans[0].getComponent<InterVillageCaravanComponent>('inter_village_caravan');
    expect(caravan).toBeDefined();
    expect(caravan!.sourceVillageId).toBe('src_v');
    expect(caravan!.targetVillageId).toBe('tgt_v');
    expect(caravan!.status).toBe('traveling');
    expect(caravan!.cargo[0].resourceType).toBe('food');
  });

  it('advances caravan progress over time', () => {
    const departedTick = 0;
    const expectedArrivalTick = 1000;

    const caravanEntity = world.createEntity() as EntityImpl;
    caravanEntity.addComponent(
      createInterVillageCaravanComponent(
        'car1', 'route1', 'src_v', 'tgt_v',
        [{ resourceType: 'wood', amount: 10 }],
        departedTick, expectedArrivalTick
      )
    );

    // At tick=500, should be 50% progress
    runSystemAt(world, eventBus, system, 500);

    const caravan = caravanEntity.getComponent<InterVillageCaravanComponent>('inter_village_caravan');
    expect(caravan!.progress).toBeCloseTo(0.5, 1);
    expect(caravan!.status).toBe('traveling');
  });

  it('marks caravan as arrived and updates target village resources', () => {
    const arrivedHandler = vi.fn();
    eventBus.subscribe('caravan:arrived', arrivedHandler);

    const targetVillageEntity = createVillageEntity(world, 'tgt_v', 'Target', { x: 200, y: 200 }, 'summary');

    const caravanEntity = world.createEntity() as EntityImpl;
    caravanEntity.addComponent(
      createInterVillageCaravanComponent(
        'car2', 'route1', 'src_v', 'tgt_v',
        [{ resourceType: 'gold', amount: 50 }],
        0, 100 // arrives at tick 100
      )
    );

    // Run past expected arrival tick (100); throttle is 100
    runSystemAt(world, eventBus, system, 200);

    const caravan = caravanEntity.getComponent<InterVillageCaravanComponent>('inter_village_caravan');
    expect(caravan!.status).toBe('arrived');
    expect(arrivedHandler).toHaveBeenCalledOnce();
    const event = arrivedHandler.mock.calls[0][0];
    expect(event.data.caravanId).toBe('car2');
    expect(event.data.targetVillageId).toBe('tgt_v');

    const targetVillage = targetVillageEntity.getComponent<VillageComponent>('village');
    expect(targetVillage!.summary.resources['gold']).toBe(50);
  });

  it('marks caravan as lost on guaranteed bandit encounter', () => {
    const lostHandler = vi.fn();
    eventBus.subscribe('caravan:lost', lostHandler);

    // A very dangerous route (safety = 0 = 100% bandit encounter chance)
    const routeEntity = world.createEntity() as EntityImpl;
    routeEntity.addComponent({
      ...createTradeRouteComponent('route_danger', 'src', 'tgt', 500),
      safety: 0.0,
    });

    // A caravan mid-journey (progress 0.3 < x < 0.8 triggers bandit check)
    const caravanEntity = world.createEntity() as EntityImpl;
    caravanEntity.addComponent({
      ...createInterVillageCaravanComponent(
        'car3', 'route_danger', 'src', 'tgt',
        [{ resourceType: 'food', amount: 10 }],
        0, 10000 // long journey
      ),
      // Note: we can't easily set progress directly since we need the system to compute it
    });

    // Run at tick 4000 (40% of 10000 journey) to trigger bandit zone (30%-80%)
    // The system will compute progress = 4000/10000 = 0.4 (in bandit range)
    runSystemAt(world, eventBus, system, 4000);

    const caravan = caravanEntity.getComponent<InterVillageCaravanComponent>('inter_village_caravan');
    // With safety=0, encounter is guaranteed; outcome is 50/50 lost vs attacked
    expect(['lost', 'attacked', 'traveling']).toContain(caravan!.status);
    // encounteredBandits should be set to true
    expect(caravan!.encounteredBandits).toBe(true);
  });
});

describe('NewsPropagationSystem', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let system: NewsPropagationSystem;

  beforeEach(async () => {
    ({ world, eventBus } = createWorld());
    system = new NewsPropagationSystem();
    await system.initialize(world as any, eventBus);
  });

  it('has correct id and priority', () => {
    expect(system.id).toBe('news_propagation');
    expect(system.priority).toBe(196);
  });

  it('propagates news to nearby village after distance-based delay', () => {
    const newsReceivedHandler = vi.fn();
    eventBus.subscribe('village:news_received', newsReceivedHandler);

    // Source village at origin
    createVillageEntity(world, 'src', 'Source Village', { x: 0, y: 0 }, 'detailed');
    // Target village 100 tiles away
    createVillageEntity(world, 'tgt', 'Target Village', { x: 100, y: 0 }, 'summary');

    // Inject a news item with large radius (> 100 tiles)
    // Distance = 100 tiles, delay = 100 * 50 = 5000 ticks
    const newsItem = createNewsItem(
      'news1', 'festival', 'A great festival occurred!',
      'src', 'Source Village',
      0,    // createdTick
      0.5,  // importance
      500   // propagationRadius (large enough to reach 100 tiles away)
    );
    system.injectNews(newsItem);

    // Throttle is 300 ticks; run at tick 6000 (> 5000 delay)
    runSystemAt(world, eventBus, system, 6000);

    expect(newsReceivedHandler).toHaveBeenCalledOnce();
    const event = newsReceivedHandler.mock.calls[0][0];
    expect(event.data.villageId).toBe('tgt');
    expect(event.data.newsId).toBe('news1');
    expect(event.data.sourceVillageId).toBe('src');
  });

  it('does NOT propagate news before delay has elapsed', () => {
    const newsReceivedHandler = vi.fn();
    eventBus.subscribe('village:news_received', newsReceivedHandler);

    createVillageEntity(world, 'src', 'Source Village', { x: 0, y: 0 }, 'detailed');
    createVillageEntity(world, 'tgt', 'Target Village', { x: 100, y: 0 }, 'summary');

    // distance=100, delay=5000 ticks
    const newsItem = createNewsItem(
      'news2', 'disaster', 'A terrible disaster!',
      'src', 'Source Village', 0, 0.8, 500
    );
    system.injectNews(newsItem);

    // Run at tick 300 (well before 5000-tick delay); throttle=300 so it runs
    runSystemAt(world, eventBus, system, 300);

    expect(newsReceivedHandler).not.toHaveBeenCalled();
  });

  it('does NOT propagate news beyond propagation radius', () => {
    const newsReceivedHandler = vi.fn();
    eventBus.subscribe('village:news_received', newsReceivedHandler);

    createVillageEntity(world, 'src', 'Source Village', { x: 0, y: 0 }, 'detailed');
    // Target is 2000 tiles away — beyond propagation radius of 500
    createVillageEntity(world, 'tgt', 'Far Village', { x: 2000, y: 0 }, 'summary');

    const newsItem = createNewsItem(
      'news3', 'trade', 'A trade deal was struck.',
      'src', 'Source Village', 0, 0.3, 500
    );
    system.injectNews(newsItem);

    // Very far in the future — the delay would be 2000*50=100,000 ticks
    // But propagationRadius is only 500, so it should never reach
    runSystemAt(world, eventBus, system, 200_000);

    expect(newsReceivedHandler).not.toHaveBeenCalled();
  });

  it('does not propagate news to the same village twice', () => {
    const newsReceivedHandler = vi.fn();
    eventBus.subscribe('village:news_received', newsReceivedHandler);

    createVillageEntity(world, 'src', 'Source Village', { x: 0, y: 0 }, 'detailed');
    createVillageEntity(world, 'tgt', 'Target Village', { x: 10, y: 0 }, 'summary');

    // Distance=10, delay=500 ticks; throttle=300
    const newsItem = createNewsItem(
      'news4', 'birth', 'A new child was born.', 'src', 'Source Village', 0, 0.2, 500
    );
    system.injectNews(newsItem);

    // Run twice — news should only be received once
    runSystemAt(world, eventBus, system, 600);
    runSystemAt(world, eventBus, system, 900);

    expect(newsReceivedHandler).toHaveBeenCalledOnce();
  });

  it('createNewsItem throws on invalid importance', () => {
    expect(() =>
      createNewsItem('x', 'war', 'desc', 'src', 'name', 0, 1.5, 100)
    ).toThrow('importance must be 0-1');
  });

  it('createNewsItem throws on negative propagationRadius', () => {
    expect(() =>
      createNewsItem('x', 'war', 'desc', 'src', 'name', 0, 0.5, -10)
    ).toThrow('propagationRadius must be non-negative');
  });
});

describe('Village status transitions', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let system: VillageSummarySystem;

  beforeEach(async () => {
    ({ world, eventBus } = createWorld());
    system = new VillageSummarySystem();
    await system.initialize(world as any, eventBus);
  });

  it('thriving -> struggling -> collapsed progression', () => {
    const computeStatus = (system as any).computeStatus.bind(system);

    let status = computeStatus(30, 200, 'stable');
    expect(status).toBe('thriving');

    status = computeStatus(3, 5, 'thriving');
    expect(status).toBe('struggling');

    status = computeStatus(0, 0, 'struggling');
    expect(status).toBe('collapsed');

    status = computeStatus(0, 0, 'collapsed');
    expect(status).toBe('ruins');
  });

  it('ruins is a permanent terminal state', () => {
    const computeStatus = (system as any).computeStatus.bind(system);

    expect(computeStatus(100, 1000, 'ruins')).toBe('ruins');
    expect(computeStatus(0, 0, 'ruins')).toBe('ruins');
  });

  it('stable with moderate population and resources', () => {
    const computeStatus = (system as any).computeStatus.bind(system);
    expect(computeStatus(10, 50, 'stable')).toBe('stable');
  });
});
