/**
 * CooldownManager - Tracks and manages spell cooldowns
 *
 * Part of Phase 30: Magic System
 */

/**
 * Manages spell cooldown state across all entities.
 * Cooldowns are tracked as: entityId -> spellId -> tickWhenAvailable
 */
export class CooldownManager {
  // entityId -> { spellId -> tickWhenAvailable }
  private cooldowns: Map<string, Map<string, number>> = new Map();

  /**
   * Check if a spell is currently on cooldown for an entity.
   */
  isOnCooldown(entityId: string, spellId: string, currentTick: number): boolean {
    const entityCooldowns = this.cooldowns.get(entityId);
    if (!entityCooldowns) return false;

    const availableTick = entityCooldowns.get(spellId);
    if (!availableTick) return false;

    return currentTick < availableTick;
  }

  /**
   * Set a cooldown for a spell on an entity.
   */
  setCooldown(entityId: string, spellId: string, availableTick: number): void {
    if (!this.cooldowns.has(entityId)) {
      this.cooldowns.set(entityId, new Map());
    }

    this.cooldowns.get(entityId)!.set(spellId, availableTick);
  }

  /**
   * Clear all cooldowns for an entity (e.g., on entity death/removal).
   */
  clearEntityCooldowns(entityId: string): void {
    this.cooldowns.delete(entityId);
  }

  /**
   * Get remaining cooldown ticks for a spell.
   * Returns 0 if not on cooldown.
   */
  getRemainingCooldown(entityId: string, spellId: string, currentTick: number): number {
    const entityCooldowns = this.cooldowns.get(entityId);
    if (!entityCooldowns) return 0;

    const availableTick = entityCooldowns.get(spellId);
    if (!availableTick) return 0;

    return Math.max(0, availableTick - currentTick);
  }
}
