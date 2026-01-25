/**
 * ComponentTypeMap - Type-safe mapping from ComponentType enum to component interfaces
 *
 * This enables fully typed `getComponent()` calls that auto-infer the return type:
 *
 * BEFORE (unsafe):
 *   const soul = entity.getComponent(ComponentType.SoulIdentity) as unknown as SoulIdentityComponent;
 *
 * AFTER (type-safe):
 *   const soul = entity.getComponent(ComponentType.SoulIdentity);
 *   // soul is automatically typed as SoulIdentityComponent | undefined
 *
 * To add a new component mapping:
 * 1. Import the component interface
 * 2. Add an entry: [ComponentType.YourType]: YourTypeComponent;
 *
 * Components not in the map will still work but return `Component | undefined` (requires manual cast)
 */

import { ComponentType } from './ComponentType.js';
import type { Component } from '../ecs/Component.js';

// === Core Components ===
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { TagsComponent } from '../components/TagsComponent.js';

// === Needs & Status ===
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { TemperatureComponent } from '../components/TemperatureComponent.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';

// === Cognition & Memory ===
import type { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import type { GoalsComponent } from '../components/GoalsComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';

// === Perception ===
import type { VisionComponent } from '../components/VisionComponent.js';
import type { ThreatDetectionComponent } from '../components/ThreatDetectionComponent.js';

// === Skills ===
import type { SkillsComponent } from '../components/SkillsComponent.js';

// === Inventory ===
import type { InventoryComponent } from '../components/InventoryComponent.js';

// === Soul System (high-impact - many casts) ===
// NOTE: Soul components are in /soul/ not /components/ - the soul versions have all the fields
import type { SoulIdentityComponent } from '../soul/SoulIdentityComponent.js';
import type { SilverThreadComponent } from '../soul/SilverThreadComponent.js';
import type { PlotLinesComponent } from '../plot/PlotTypes.js';
import type { SoulLinkComponent } from '../soul/SoulLinkComponent.js';

// === Buildings ===
import type { BuildingComponent } from '../components/BuildingComponent.js';

// === Plants & Nature ===
import type { PlantComponent } from '../components/PlantComponent.js';

// === Divinity ===
import type { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';

// === Relationships & Social ===
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import type { ParentingComponent } from '../components/ParentingComponent.js';

/**
 * Maps ComponentType enum values to their corresponding component interfaces.
 *
 * Using this with getComponent() provides automatic type inference:
 *   entity.getComponent(ComponentType.Agent) -> AgentComponent | undefined
 *
 * Components not mapped here still work but return the base Component type.
 */
export interface ComponentTypeMap {
  // Core
  [ComponentType.Agent]: AgentComponent;
  [ComponentType.Position]: PositionComponent;
  [ComponentType.Movement]: MovementComponent;
  [ComponentType.Identity]: IdentityComponent;
  [ComponentType.Tags]: TagsComponent;

  // Needs & Status
  [ComponentType.Needs]: NeedsComponent;
  [ComponentType.Temperature]: TemperatureComponent;
  [ComponentType.Mood]: MoodComponent;
  [ComponentType.Circadian]: CircadianComponent;

  // Cognition & Memory
  [ComponentType.EpisodicMemory]: EpisodicMemoryComponent;
  [ComponentType.SpatialMemory]: SpatialMemoryComponent;
  [ComponentType.Goals]: GoalsComponent;
  [ComponentType.Personality]: PersonalityComponent;

  // Perception
  [ComponentType.Vision]: VisionComponent;
  [ComponentType.ThreatDetection]: ThreatDetectionComponent;

  // Skills
  [ComponentType.Skills]: SkillsComponent;

  // Inventory
  [ComponentType.Inventory]: InventoryComponent;

  // Soul System
  [ComponentType.SoulIdentity]: SoulIdentityComponent;
  [ComponentType.SilverThread]: SilverThreadComponent;
  [ComponentType.PlotLines]: PlotLinesComponent;
  [ComponentType.SoulLink]: SoulLinkComponent;

  // Buildings
  [ComponentType.Building]: BuildingComponent;

  // Plants
  [ComponentType.Plant]: PlantComponent;

  // Divinity
  [ComponentType.Deity]: DeityComponent;
  [ComponentType.Spiritual]: SpiritualComponent;

  // Relationships & Social
  [ComponentType.Relationship]: RelationshipComponent;
  [ComponentType.Parenting]: ParentingComponent;
}

/**
 * Helper type: Get the component type for a given ComponentType key.
 * Falls back to Component for unmapped types.
 */
export type ComponentFor<K extends ComponentType> =
  K extends keyof ComponentTypeMap ? ComponentTypeMap[K] : Component;
