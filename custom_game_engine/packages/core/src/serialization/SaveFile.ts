import type {
  EntityId,
  ComponentType,
  Tick,
  GameTime,
  FeatureFlags,
  EventType,
} from '../types.js';
import type { ActionStatus } from '../actions/Action.js';

/**
 * Complete save file structure.
 */
export interface SaveFile {
  readonly header: SaveHeader;
  readonly world: SerializedWorld;
  readonly eventHistory?: ReadonlyArray<SerializedEvent>;
  readonly actionHistory?: ReadonlyArray<SerializedAction>;
}

export interface SaveHeader {
  /** Overall save format version */
  readonly saveVersion: number;

  /** Semantic version of game that created this save */
  readonly gameVersion: string;

  /** Version of each component schema at time of save */
  readonly componentVersions: Readonly<Record<ComponentType, number>>;

  /** When save was created */
  readonly createdAt: string;

  /** When save was last opened */
  readonly lastPlayedAt: string;

  /** Total play time in seconds */
  readonly playTime: number;

  /** Current game tick */
  readonly tick: Tick;

  /** Feature flags */
  readonly features: FeatureFlags;

  // UI metadata
  readonly worldName: string;
  readonly worldSeed: string;
  readonly agentCount: number;
  readonly villageName?: string;
}

export interface SerializedWorld {
  readonly tick: Tick;
  readonly gameTime: GameTime;
  readonly chunks: ReadonlyArray<SerializedChunk>;
  readonly entities: ReadonlyArray<SerializedEntity>;
  readonly globals: SerializedGlobals;
}

export interface SerializedChunk {
  readonly x: number;
  readonly y: number;
  readonly generated: boolean;
  readonly tiles: ReadonlyArray<SerializedTile>;
  readonly entityIds: ReadonlyArray<EntityId>;
}

export interface SerializedTile {
  readonly terrain: string;
  readonly floor?: string;
  readonly moisture: number;
  readonly fertility: number;
  readonly [key: string]: unknown;
}

export interface SerializedEntity {
  readonly id: EntityId;
  readonly archetype: string;
  readonly createdAt: Tick;
  readonly components: ReadonlyArray<SerializedComponent>;
}

export interface SerializedComponent {
  readonly type: ComponentType;
  readonly version: number;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface SerializedGlobals {
  readonly [system: string]: unknown;
}

export interface SerializedEvent {
  readonly type: EventType;
  readonly tick: Tick;
  readonly source: string;
  readonly data: Readonly<Record<string, unknown>>;
}

export interface SerializedAction {
  readonly id: string;
  readonly type: string;
  readonly actorId: EntityId;
  readonly status: ActionStatus;
  readonly createdAt: Tick;
  readonly completedAt?: Tick;
  readonly success?: boolean;
}
