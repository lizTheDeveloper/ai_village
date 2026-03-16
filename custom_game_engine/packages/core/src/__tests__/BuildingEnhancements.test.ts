import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/index.js';
import { EventBusImpl } from '../events/EventBus.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { BuildingType } from '../types/BuildingType.js';
import { createBuildingComponent } from '../components/BuildingComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import {
  createBuildingConditionComponent,
  getOverallCondition,
  hasCriticalDamage,
  totalRepairCost,
  DEFAULT_MAINTENANCE_SCHEDULES,
  type BuildingConditionComponent,
} from '../components/BuildingConditionComponent.js';
import {
  createBuildingUpgradeComponent,
  BUILDING_UPGRADE_DEFINITIONS,
  getAvailableUpgrades,
  getUpgradesForBuilding,
  type BuildingUpgradeComponent,
} from '../components/BuildingUpgradeComponent.js';
import { BuildingUpgradeSystem } from '../systems/BuildingUpgradeSystem.js';

// ── BuildingConditionComponent tests ─────────────────────────────────────────

describe('BuildingConditionComponent', () => {
  it('starts at perfect condition', () => {
    const cond = createBuildingConditionComponent();
    expect(cond.durability).toBe(100);
    expect(cond.cleanliness).toBe(100);
    expect(cond.functionality).toBe(100);
    expect(cond.aesthetics).toBe(100);
    expect(cond.ageTicks).toBe(0);
    expect(cond.criticalDamage).toHaveLength(0);
  });

  it('getOverallCondition returns minimum axis', () => {
    const cond = createBuildingConditionComponent();
    cond.durability = 90;
    cond.cleanliness = 60;
    cond.functionality = 80;
    cond.aesthetics = 75;
    expect(getOverallCondition(cond)).toBe(60);
  });

  it('hasCriticalDamage returns false when none present', () => {
    const cond = createBuildingConditionComponent();
    expect(hasCriticalDamage(cond)).toBe(false);
  });

  it('hasCriticalDamage returns true when damage exceeds threshold', () => {
    const cond = createBuildingConditionComponent();
    cond.criticalDamage.push({
      type: 'roof_leak',
      severity: 60,
      location: 'roof',
      ticksPresent: 0,
      repairMaterialType: 'thatch',
      repairMaterialQuantity: 10,
      repairTimeTicks: 1000,
    });
    expect(hasCriticalDamage(cond, 50)).toBe(true);
    expect(hasCriticalDamage(cond, 70)).toBe(false);
  });

  it('totalRepairCost aggregates material quantities', () => {
    const cond = createBuildingConditionComponent();
    cond.criticalDamage.push(
      { type: 'roof_leak',   severity: 30, location: 'roof', ticksPresent: 0, repairMaterialType: 'thatch', repairMaterialQuantity: 10, repairTimeTicks: 1000 },
      { type: 'cracked_wall', severity: 40, location: 'wall', ticksPresent: 0, repairMaterialType: 'stone',  repairMaterialQuantity: 20, repairTimeTicks: 2000 },
      { type: 'broken_window', severity: 25, location: 'window', ticksPresent: 0, repairMaterialType: 'stone', repairMaterialQuantity: 5, repairTimeTicks: 500 },
    );
    const cost = totalRepairCost(cond);
    expect(cost['thatch']).toBe(10);
    expect(cost['stone']).toBe(25); // 20 + 5
  });

  it('default maintenance schedule is initialized for known building types', () => {
    const defaultSchedule = DEFAULT_MAINTENANCE_SCHEDULES['default'];
    expect(defaultSchedule).toBeDefined();
    expect(defaultSchedule!.length).toBeGreaterThan(0);
    expect(defaultSchedule![0]!.taskType).toBe('cleaning');
  });

  it('custom maintenance tasks are preserved on creation', () => {
    const tasks = DEFAULT_MAINTENANCE_SCHEDULES['workshop']!;
    const cond = createBuildingConditionComponent(tasks);
    expect(cond.maintenanceTasks).toHaveLength(tasks.length);
    expect(cond.maintenanceTasks[0]!.taskType).toBe('cleaning');
  });
});

// ── BuildingUpgradeComponent + definitions tests ──────────────────────────────

describe('BuildingUpgradeComponent', () => {
  it('starts with no upgrades applied', () => {
    const comp = createBuildingUpgradeComponent();
    expect(comp.appliedUpgrades).toHaveLength(0);
    expect(comp.pendingUpgradeId).toBeNull();
    expect(comp.upgradeProgress).toBe(0);
    expect(comp.maintenanceCostMultiplier).toBe(1.0);
  });

  it('BUILDING_UPGRADE_DEFINITIONS contains required upgrade paths', () => {
    // House path
    expect(BUILDING_UPGRADE_DEFINITIONS['house_insulation']).toBeDefined();
    expect(BUILDING_UPGRADE_DEFINITIONS['house_stone_foundation']).toBeDefined();
    expect(BUILDING_UPGRADE_DEFINITIONS['house_second_story']).toBeDefined();
    expect(BUILDING_UPGRADE_DEFINITIONS['house_luxury_interior']).toBeDefined();

    // Workshop path
    expect(BUILDING_UPGRADE_DEFINITIONS['workshop_better_tools']).toBeDefined();
    expect(BUILDING_UPGRADE_DEFINITIONS['workshop_more_workstations']).toBeDefined();

    // Storage path
    expect(BUILDING_UPGRADE_DEFINITIONS['storage_shelving']).toBeDefined();

    // Farm path
    expect(BUILDING_UPGRADE_DEFINITIONS['farm_irrigation']).toBeDefined();
  });

  it('getUpgradesForBuilding returns only matching building types', () => {
    const houseUpgrades = getUpgradesForBuilding('house');
    expect(houseUpgrades.every((u) => u.targetBuildingType === 'house')).toBe(true);
    expect(houseUpgrades.length).toBeGreaterThanOrEqual(4);
  });
});

describe('getAvailableUpgrades', () => {
  it('returns first-tier upgrades when none applied', () => {
    const available = getAvailableUpgrades('house', [], 0, {});
    const ids = available.map((u) => u.id);
    expect(ids).toContain('house_insulation');
    // stone_foundation requires building_age
    expect(ids).not.toContain('house_stone_foundation');
  });

  it('respects building_age prerequisite', () => {
    const notYet = getAvailableUpgrades('house', [], 0, {});
    const foundationNotReady = notYet.find((u) => u.id === 'house_stone_foundation');
    expect(foundationNotReady).toBeUndefined();

    // Supply sufficient age
    const sufficientAge = 100 * 1200 + 1;
    const ready = getAvailableUpgrades('house', [], sufficientAge, {});
    const foundation = ready.find((u) => u.id === 'house_stone_foundation');
    expect(foundation).toBeDefined();
  });

  it('respects previous_upgrade prerequisite', () => {
    // house_second_story requires house_stone_foundation
    const withoutFoundation = getAvailableUpgrades('house', [], 200 * 1200, { construction: 5 });
    expect(withoutFoundation.find((u) => u.id === 'house_second_story')).toBeUndefined();

    const withFoundation = getAvailableUpgrades('house', ['house_stone_foundation'], 200 * 1200, { construction: 5 });
    expect(withFoundation.find((u) => u.id === 'house_second_story')).toBeDefined();
  });

  it('respects owner_skill prerequisite', () => {
    const noSkill = getAvailableUpgrades('house', ['house_stone_foundation'], 200 * 1200, { construction: 4 });
    expect(noSkill.find((u) => u.id === 'house_second_story')).toBeUndefined();

    const hasSkill = getAvailableUpgrades('house', ['house_stone_foundation'], 200 * 1200, { construction: 5 });
    expect(hasSkill.find((u) => u.id === 'house_second_story')).toBeDefined();
  });

  it('does not return already-applied upgrades', () => {
    const already = getAvailableUpgrades('house', ['house_insulation'], 200 * 1200, {});
    expect(already.find((u) => u.id === 'house_insulation')).toBeUndefined();
  });
});

// ── BuildingUpgradeSystem tests ───────────────────────────────────────────────

describe('BuildingUpgradeSystem', () => {
  let world: World;
  let eventBus: EventBusImpl;
  let system: BuildingUpgradeSystem;

  beforeEach(async () => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    system = new BuildingUpgradeSystem();
    await system.initialize(world, eventBus);
  });

  function createCompleteBuilding(buildingType = 'house'): EntityImpl {
    const entity = world.createEntity() as EntityImpl;
    entity.addComponent({ ...createBuildingComponent(BuildingType.WorkBench, 1, 100), buildingType, isComplete: true });
    entity.addComponent(createPositionComponent(5, 5));
    const upgradeComp = createBuildingUpgradeComponent();
    entity.addComponent(upgradeComp);
    return entity;
  }

  it('does not advance progress when no pendingUpgradeId set', () => {
    const entity = createCompleteBuilding();
    const upgrade = (entity as EntityImpl).getComponent<BuildingUpgradeComponent>(CT.BuildingUpgrade)!;
    expect(upgrade.upgradeProgress).toBe(0);

    // Run system
    const entities = world.query().with(CT.Building).with(CT.BuildingUpgrade).executeEntities();
    (system as any).onUpdate({ world, activeEntities: entities });

    expect(upgrade.upgradeProgress).toBe(0);
  });

  it('clears unknown upgrade ID without crashing', () => {
    const entity = createCompleteBuilding();
    const upgrade = (entity as EntityImpl).getComponent<BuildingUpgradeComponent>(CT.BuildingUpgrade)!;
    upgrade.pendingUpgradeId = 'nonexistent_upgrade';

    const entities = world.query().with(CT.Building).with(CT.BuildingUpgrade).executeEntities();
    (system as any).onUpdate({ world, activeEntities: entities });

    expect(upgrade.pendingUpgradeId).toBeNull();
  });

  it('applies upgrade effects and moves to appliedUpgrades on completion', () => {
    const entity = createCompleteBuilding('house');
    const upgrade = (entity as EntityImpl).getComponent<BuildingUpgradeComponent>(CT.BuildingUpgrade)!;
    upgrade.pendingUpgradeId = 'house_insulation';
    // Set high enough that one throttleInterval (100 ticks) of labor completes it.
    // house_insulation: laborCostTicks=48000, gain per call = (100*0.05/48000)*100 ≈ 0.01%.
    // Setting to 99.99 guarantees completion in one onUpdate call.
    upgrade.upgradeProgress = 99.99;

    const entities = world.query().with(CT.Building).with(CT.BuildingUpgrade).executeEntities();
    (system as any).onUpdate({ world, activeEntities: entities });

    expect(upgrade.appliedUpgrades).toContain('house_insulation');
    expect(upgrade.pendingUpgradeId).toBeNull();
    expect(upgrade.upgradeProgress).toBe(0);
    expect(upgrade.bonusComfort).toBeGreaterThan(0);
    expect(upgrade.maintenanceCostMultiplier).toBeLessThan(1.0);
  });

  it('emits building:upgrade_completed event on completion', () => {
    const entity = createCompleteBuilding('house');
    const upgrade = (entity as EntityImpl).getComponent<BuildingUpgradeComponent>(CT.BuildingUpgrade)!;
    upgrade.pendingUpgradeId = 'house_insulation';
    upgrade.upgradeProgress = 99.99;

    const events: unknown[] = [];
    // EventBusImpl uses subscribe(), not onGeneric() (which is on SystemEventManager)
    eventBus.subscribe('building:upgrade_completed', (e) => events.push(e));

    const entities = world.query().with(CT.Building).with(CT.BuildingUpgrade).executeEntities();
    (system as any).onUpdate({ world, activeEntities: entities });
    // Events are queued by emit(); flush() dispatches them to subscribers.
    eventBus.flush();

    expect(events.length).toBeGreaterThan(0);
  });
});
