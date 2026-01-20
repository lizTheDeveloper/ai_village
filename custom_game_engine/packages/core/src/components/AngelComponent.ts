/**
 * AngelComponent - Divine servant/messenger component
 *
 * Angels are divine agents created by deities to serve as messengers,
 * guardians, warriors, and performers of miracles. They require ongoing
 * belief to maintain and can be customized by their creating deity.
 *
 * This component tracks an angel's identity, current state, abilities,
 * orders, and relationship with their deity.
 */

import { ComponentBase } from '../ecs/Component.js';
import type {
  Angel,
  AngelType,
  AngelRank,
  AngelForm,
  AngelStats,
  AngelState,
  AngelPersonality,
  AngelAbility,
  AngelOrders,
} from '../divinity/AngelTypes.js';
import type { DivineDomain } from '../divinity/DeityTypes.js';

/**
 * AngelComponent - Tracks an angel entity's divine properties
 *
 * Angels are created by deities using the belief economy. They serve
 * their creator deity by delivering messages, protecting believers,
 * guarding sacred sites, performing miracles, and fighting divine battles.
 */
export class AngelComponent extends ComponentBase {
  public readonly type = 'angel';

  // Identity
  public id: string;
  public creatorDeityId: string;
  public entityId: string;
  public name: string;
  public title?: string;

  // Classification
  public angelType: AngelType;
  public rank: AngelRank;

  // Physical manifestation
  public form: AngelForm;

  // Stats & Capabilities
  public stats: AngelStats;

  // Current state
  public state: AngelState;

  // Personality
  public personality: AngelPersonality;

  // Abilities granted by deity
  public abilities: AngelAbility[];

  // Current orders from deity
  public currentOrders?: AngelOrders;

  // Domain alignment
  public alignedDomains: DivineDomain[];

  // Timeline
  public createdAt: number;
  public totalServiceTime: number;

  // History & Reputation
  public notableDeedIds: string[];
  public mythIds: string[];
  public knownToAgentIds: string[];

  constructor(angelData: Angel) {
    super();

    this.id = angelData.id;
    this.creatorDeityId = angelData.creatorDeityId;
    this.entityId = angelData.entityId;
    this.name = angelData.name;
    this.title = angelData.title;
    this.angelType = angelData.type;
    this.rank = angelData.rank;
    this.form = angelData.form;
    this.stats = angelData.stats;
    this.state = angelData.state;
    this.personality = angelData.personality;
    this.abilities = angelData.abilities;
    this.currentOrders = angelData.currentOrders;
    this.alignedDomains = angelData.alignedDomains;
    this.createdAt = angelData.createdAt;
    this.totalServiceTime = angelData.totalServiceTime;
    this.notableDeedIds = angelData.notableDeedIds;
    this.mythIds = angelData.mythIds;
    this.knownToAgentIds = angelData.knownToAgentIds;
  }

  /**
   * Check if angel is currently active and manifested
   */
  isActive(): boolean {
    return this.state.active;
  }

  /**
   * Check if angel is visible to mortals
   */
  isVisible(): boolean {
    return this.state.visible;
  }

  /**
   * Check if angel is currently in the mortal realm
   */
  isInMortalRealm(): boolean {
    return this.state.inMortalRealm;
  }

  /**
   * Check if angel is currently in combat
   */
  isInCombat(): boolean {
    return this.state.inCombat;
  }

  /**
   * Check if angel has active orders
   */
  hasOrders(): boolean {
    return this.currentOrders !== undefined;
  }

  /**
   * Check if angel is currently respawning
   */
  isRespawning(): boolean {
    return this.state.respawnAt !== undefined;
  }

  /**
   * Get current health percentage
   */
  getHealthPercentage(): number {
    return this.stats.health / this.stats.maxHealth;
  }

  /**
   * Check if angel can use a specific ability
   */
  canUseAbility(abilityId: string, currentTick: number): boolean {
    const ability = this.abilities.find(a => a.id === abilityId);
    if (!ability) {
      return false;
    }

    // Check cooldown
    if (ability.lastUsedAt !== undefined) {
      const cooldownTicks = ability.cooldown * 60 * 20; // hours to ticks (20 TPS)
      if (currentTick - ability.lastUsedAt < cooldownTicks) {
        return false;
      }
    }

    return true;
  }

  /**
   * Mark ability as used
   */
  useAbility(abilityId: string, currentTick: number): void {
    const ability = this.abilities.find(a => a.id === abilityId);
    if (!ability) {
      throw new Error(`Angel ${this.id} does not have ability ${abilityId}`);
    }

    ability.lastUsedAt = currentTick;
  }

  /**
   * Add a notable deed to angel's history
   */
  recordNotableDeed(deedId: string): void {
    if (!this.notableDeedIds.includes(deedId)) {
      this.notableDeedIds.push(deedId);
    }
  }

  /**
   * Add a myth about this angel
   */
  recordMyth(mythId: string): void {
    if (!this.mythIds.includes(mythId)) {
      this.mythIds.push(mythId);
    }
  }

  /**
   * Record that a mortal has learned of this angel
   */
  becomeKnownTo(agentId: string): void {
    if (!this.knownToAgentIds.includes(agentId)) {
      this.knownToAgentIds.push(agentId);
    }
  }

  /**
   * Update total service time
   */
  addServiceTime(hours: number): void {
    this.totalServiceTime += hours;
  }

  /**
   * Set current orders
   */
  setOrders(orders: AngelOrders): void {
    this.currentOrders = orders;
  }

  /**
   * Clear current orders
   */
  clearOrders(): void {
    this.currentOrders = undefined;
  }

  /**
   * Update angel's position
   */
  setPosition(x: number, y: number): void {
    this.state.position = { x, y };
  }

  /**
   * Set visibility state
   */
  setVisible(visible: boolean): void {
    this.state.visible = visible;
  }

  /**
   * Set combat state
   */
  setCombatState(inCombat: boolean): void {
    this.state.inCombat = inCombat;
  }

  /**
   * Update current activity
   */
  setActivity(activity: AngelState['currentActivity']): void {
    this.state.currentActivity = activity;
  }

  /**
   * Take damage
   */
  takeDamage(amount: number): void {
    if (amount < 0) {
      throw new Error('Damage amount must be non-negative');
    }
    this.stats.health = Math.max(0, this.stats.health - amount);
  }

  /**
   * Heal
   */
  heal(amount: number): void {
    if (amount < 0) {
      throw new Error('Heal amount must be non-negative');
    }
    this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + amount);
  }

  /**
   * Check if angel is dead
   */
  isDead(): boolean {
    return this.stats.health <= 0;
  }

  /**
   * Set respawn time
   */
  setRespawnTime(tick: number): void {
    this.state.respawnAt = tick;
  }

  /**
   * Clear respawn time (when respawned)
   */
  clearRespawnTime(): void {
    this.state.respawnAt = undefined;
  }
}

/**
 * Create a new angel component from angel data
 */
export function createAngelComponent(angelData: Angel): AngelComponent {
  return new AngelComponent(angelData);
}
