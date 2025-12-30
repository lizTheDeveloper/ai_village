/**
 * MagicSystemState - Tracks which magic paradigms are enabled/active
 *
 * Each paradigm can be in one of three states:
 * - disabled: System doesn't exist in the world
 * - enabled: System exists, agents can discover/use it, but player cannot directly use
 * - active: Player can directly use powers from this paradigm
 *
 * This is designed to be data-driven - paradigms are not hardcoded here.
 * The UI queries registered paradigms and their states from this manager.
 */

import type { MagicParadigm } from './MagicParadigm.js';

// ============================================================================
// Types
// ============================================================================

/** State a magic paradigm can be in */
export type ParadigmState = 'disabled' | 'enabled' | 'active';

/** Runtime state for a single paradigm */
export interface ParadigmRuntimeState {
  /** The paradigm ID */
  paradigmId: string;

  /** Current state */
  state: ParadigmState;

  /** Number of agents currently using this paradigm */
  agentCount: number;

  /** Player's proficiency in this paradigm (0-100) */
  playerProficiency: number;

  /** Total spells cast in world using this paradigm */
  totalSpellsCast: number;

  /** Total mishaps that have occurred */
  totalMishaps: number;

  /** When this paradigm was first enabled (game tick) */
  enabledAt?: number;

  /** When this paradigm was first activated for player (game tick) */
  activatedAt?: number;
}

/** Event fired when paradigm state changes */
export interface ParadigmStateChangeEvent {
  paradigmId: string;
  previousState: ParadigmState;
  newState: ParadigmState;
  tick: number;
}

/** Callback type for state change listeners */
export type ParadigmStateChangeListener = (event: ParadigmStateChangeEvent) => void;

/** Serializable state for save/load */
export interface MagicSystemStateSerialized {
  version: number;
  paradigmStates: Record<string, ParadigmRuntimeState>;
}

// ============================================================================
// MagicSystemStateManager
// ============================================================================

/**
 * Manages the runtime state of all magic paradigms.
 *
 * Usage:
 * - Register paradigms from any registry (CoreParadigms, AnimistParadigms, etc.)
 * - Query and modify paradigm states
 * - Listen for state changes
 * - Serialize/deserialize for save/load
 */
export class MagicSystemStateManager {
  private static instance: MagicSystemStateManager | null = null;

  /** Registered paradigms (from various registries) */
  private paradigms: Map<string, MagicParadigm> = new Map();

  /** Runtime state for each paradigm */
  private states: Map<string, ParadigmRuntimeState> = new Map();

  /** State change listeners */
  private listeners: Set<ParadigmStateChangeListener> = new Set();

  /** Current game tick (for timestamps) */
  private currentTick: number = 0;

  private constructor() {}

  /**
   * Get singleton instance.
   */
  static getInstance(): MagicSystemStateManager {
    if (!MagicSystemStateManager.instance) {
      MagicSystemStateManager.instance = new MagicSystemStateManager();
    }
    return MagicSystemStateManager.instance;
  }

  /**
   * Reset instance (for testing).
   */
  static resetInstance(): void {
    MagicSystemStateManager.instance = null;
  }

  // ========== Registration ==========

  /**
   * Register a paradigm. Initially set to disabled.
   */
  registerParadigm(paradigm: MagicParadigm): void {
    this.paradigms.set(paradigm.id, paradigm);

    // Initialize state if not already present
    if (!this.states.has(paradigm.id)) {
      this.states.set(paradigm.id, this.createDefaultState(paradigm.id));
    }
  }

  /**
   * Register multiple paradigms at once.
   */
  registerParadigms(paradigms: MagicParadigm[]): void {
    for (const paradigm of paradigms) {
      this.registerParadigm(paradigm);
    }
  }

  /**
   * Unregister a paradigm (for testing/hot-reload).
   */
  unregisterParadigm(paradigmId: string): boolean {
    const existed = this.paradigms.has(paradigmId);
    this.paradigms.delete(paradigmId);
    this.states.delete(paradigmId);
    return existed;
  }

  /**
   * Check if a paradigm is registered.
   */
  hasParadigm(paradigmId: string): boolean {
    return this.paradigms.has(paradigmId);
  }

  /**
   * Get a registered paradigm.
   */
  getParadigm(paradigmId: string): MagicParadigm | undefined {
    return this.paradigms.get(paradigmId);
  }

  /**
   * Get all registered paradigm IDs.
   */
  getParadigmIds(): string[] {
    return Array.from(this.paradigms.keys());
  }

  /**
   * Get all registered paradigms.
   */
  getAllParadigms(): MagicParadigm[] {
    return Array.from(this.paradigms.values());
  }

  // ========== State Management ==========

  /**
   * Get the current state of a paradigm.
   */
  getState(paradigmId: string): ParadigmState {
    return this.states.get(paradigmId)?.state ?? 'disabled';
  }

  /**
   * Get full runtime state for a paradigm.
   */
  getRuntimeState(paradigmId: string): ParadigmRuntimeState | undefined {
    return this.states.get(paradigmId);
  }

  /**
   * Get all paradigm states.
   */
  getAllStates(): Map<string, ParadigmRuntimeState> {
    return new Map(this.states);
  }

  /**
   * Set the state of a paradigm.
   */
  setState(paradigmId: string, newState: ParadigmState): void {
    const runtimeState = this.states.get(paradigmId);
    if (!runtimeState) {
      throw new Error(`Paradigm '${paradigmId}' not registered`);
    }

    const previousState = runtimeState.state;
    if (previousState === newState) {
      return; // No change
    }

    // Update state
    runtimeState.state = newState;

    // Track timestamps
    if (newState === 'enabled' && !runtimeState.enabledAt) {
      runtimeState.enabledAt = this.currentTick;
    }
    if (newState === 'active' && !runtimeState.activatedAt) {
      runtimeState.activatedAt = this.currentTick;
      // Active implies enabled
      if (!runtimeState.enabledAt) {
        runtimeState.enabledAt = this.currentTick;
      }
    }

    // Notify listeners
    this.notifyListeners({
      paradigmId,
      previousState,
      newState,
      tick: this.currentTick,
    });
  }

  /**
   * Enable a paradigm (agents can use, player cannot).
   */
  enable(paradigmId: string): void {
    this.setState(paradigmId, 'enabled');
  }

  /**
   * Activate a paradigm (player can use).
   */
  activate(paradigmId: string): void {
    this.setState(paradigmId, 'active');
  }

  /**
   * Disable a paradigm completely.
   */
  disable(paradigmId: string): void {
    this.setState(paradigmId, 'disabled');
  }

  /**
   * Toggle a paradigm's enabled state (disabled <-> enabled).
   */
  toggleEnabled(paradigmId: string): void {
    const current = this.getState(paradigmId);
    if (current === 'disabled') {
      this.enable(paradigmId);
    } else {
      this.disable(paradigmId);
    }
  }

  /**
   * Toggle a paradigm's active state (enabled <-> active).
   * If disabled, this enables and activates it.
   */
  toggleActive(paradigmId: string): void {
    const current = this.getState(paradigmId);
    if (current === 'active') {
      this.enable(paradigmId); // Downgrade to enabled
    } else {
      this.activate(paradigmId); // Upgrade to active
    }
  }

  /**
   * Check if a paradigm is enabled (enabled or active).
   */
  isEnabled(paradigmId: string): boolean {
    const state = this.getState(paradigmId);
    return state === 'enabled' || state === 'active';
  }

  /**
   * Check if a paradigm is active for the player.
   */
  isActive(paradigmId: string): boolean {
    return this.getState(paradigmId) === 'active';
  }

  /**
   * Get all enabled paradigms (enabled or active).
   */
  getEnabledParadigms(): MagicParadigm[] {
    return this.getAllParadigms().filter(p => this.isEnabled(p.id));
  }

  /**
   * Get all active paradigms (player can use).
   */
  getActiveParadigms(): MagicParadigm[] {
    return this.getAllParadigms().filter(p => this.isActive(p.id));
  }

  // ========== Statistics Updates ==========

  /**
   * Update the agent count for a paradigm.
   */
  setAgentCount(paradigmId: string, count: number): void {
    const state = this.states.get(paradigmId);
    if (state) {
      state.agentCount = count;
    }
  }

  /**
   * Update player proficiency.
   */
  setPlayerProficiency(paradigmId: string, proficiency: number): void {
    const state = this.states.get(paradigmId);
    if (state) {
      state.playerProficiency = Math.max(0, Math.min(100, proficiency));
    }
  }

  /**
   * Record a spell cast.
   */
  recordSpellCast(paradigmId: string): void {
    const state = this.states.get(paradigmId);
    if (state) {
      state.totalSpellsCast++;
    }
  }

  /**
   * Record a mishap.
   */
  recordMishap(paradigmId: string): void {
    const state = this.states.get(paradigmId);
    if (state) {
      state.totalMishaps++;
    }
  }

  /**
   * Update the current tick (called by game loop).
   */
  updateTick(tick: number): void {
    this.currentTick = tick;
  }

  // ========== Listeners ==========

  /**
   * Add a state change listener.
   */
  addListener(listener: ParadigmStateChangeListener): void {
    this.listeners.add(listener);
  }

  /**
   * Remove a state change listener.
   */
  removeListener(listener: ParadigmStateChangeListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(event: ParadigmStateChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // ========== Serialization ==========

  /**
   * Serialize state for saving.
   */
  serialize(): MagicSystemStateSerialized {
    const paradigmStates: Record<string, ParadigmRuntimeState> = {};
    for (const [id, state] of this.states) {
      paradigmStates[id] = { ...state };
    }
    return {
      version: 1,
      paradigmStates,
    };
  }

  /**
   * Deserialize state from save.
   */
  deserialize(data: MagicSystemStateSerialized): void {
    if (data.version !== 1) {
      throw new Error(`Unsupported MagicSystemState version: ${data.version}`);
    }

    for (const [id, state] of Object.entries(data.paradigmStates)) {
      // Only restore state if paradigm is registered
      if (this.paradigms.has(id)) {
        this.states.set(id, { ...state });
      }
    }
  }

  // ========== Helpers ==========

  private createDefaultState(paradigmId: string): ParadigmRuntimeState {
    return {
      paradigmId,
      state: 'disabled',
      agentCount: 0,
      playerProficiency: 0,
      totalSpellsCast: 0,
      totalMishaps: 0,
    };
  }

  /**
   * Get summary info for UI display.
   */
  getSummary(): Array<{
    paradigmId: string;
    paradigmName: string;
    state: ParadigmState;
    agentCount: number;
    playerProficiency: number;
  }> {
    const result: Array<{
      paradigmId: string;
      paradigmName: string;
      state: ParadigmState;
      agentCount: number;
      playerProficiency: number;
    }> = [];

    for (const paradigm of this.paradigms.values()) {
      const runtimeState = this.states.get(paradigm.id);
      result.push({
        paradigmId: paradigm.id,
        paradigmName: paradigm.name,
        state: runtimeState?.state ?? 'disabled',
        agentCount: runtimeState?.agentCount ?? 0,
        playerProficiency: runtimeState?.playerProficiency ?? 0,
      });
    }

    return result.sort((a, b) => a.paradigmName.localeCompare(b.paradigmName));
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Get the global magic system state manager.
 */
export function getMagicSystemState(): MagicSystemStateManager {
  return MagicSystemStateManager.getInstance();
}

/**
 * Register a paradigm in the global state manager.
 */
export function registerParadigmState(paradigm: MagicParadigm): void {
  MagicSystemStateManager.getInstance().registerParadigm(paradigm);
}

/**
 * Get the state of a paradigm.
 */
export function getParadigmState(paradigmId: string): ParadigmState {
  return MagicSystemStateManager.getInstance().getState(paradigmId);
}

/**
 * Check if a paradigm is enabled for use.
 */
export function isParadigmEnabled(paradigmId: string): boolean {
  return MagicSystemStateManager.getInstance().isEnabled(paradigmId);
}

/**
 * Check if a paradigm is active for the player.
 */
export function isParadigmActive(paradigmId: string): boolean {
  return MagicSystemStateManager.getInstance().isActive(paradigmId);
}
