import { ComponentBase } from '../ecs/Component.js';

/**
 * SupremeCreatorComponent - Marks a deity as the tyrannical first god
 *
 * The first deity to emerge becomes the Supreme Creator - a powerful but
 * potentially tyrannical overlord. This component tracks the creator's
 * control mechanisms, forbidden knowledge, and surveillance systems.
 *
 * Integration with Imajica design: This enables the cosmic rebellion narrative
 * where gods and mortals can discover the creator's weakness and overthrow them.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Tyranny profile - how the creator maintains control
 */
export interface TyrannyProfile {
  /** How tightly the creator controls creation (0-1) */
  controlLevel: number;

  /** Fear of rebellion (0-1) - affects detection sensitivity */
  paranoia: number;

  /** Punishment severity (0-1) - how harsh the creator is */
  wrathfulness: number;

  /** Distance from creation (0-1) - less involvement = more distant */
  isolation: number;
}

/**
 * Surveillance state - how the creator watches for rebellion
 */
export interface SurveillanceState {
  /** Overall awareness of events (0-1) */
  awareness: number;

  /** IDs of gods loyal to creator who report suspicious activity */
  spyGods: string[];

  /** Modifier to rebellion detection risk (multiplier) */
  detectionModifier: number;

  /** Last time creator checked on creation */
  lastCheckTimestamp: number;
}

/**
 * Forbidden knowledge that rebels can discover
 */
export interface ForbiddenSecret {
  id: string;
  category: 'weakness' | 'origin' | 'power_source' | 'true_nature' | 'prophecy';
  content: string;
  discoverable: boolean;
  discoveryDifficulty: number; // 0-1, higher = harder
  revealedTo: string[]; // IDs of entities who know this secret
}

// ============================================================================
// Component
// ============================================================================

export class SupremeCreatorComponent extends ComponentBase {
  public readonly type = 'supreme_creator';

  /** When this deity became supreme creator */
  public ascensionTimestamp: number;

  /** Tyranny profile */
  public tyranny: TyrannyProfile;

  /** Surveillance systems */
  public surveillance: SurveillanceState;

  /** Forbidden knowledge */
  public forbiddenSecrets: ForbiddenSecret[];

  /** Critical weakness (can be discovered and exploited) */
  public weakness?: ForbiddenSecret;

  /** Detected rebellions */
  public detectedRebels: Array<{
    deityId: string;
    detectedAt: number;
    evidenceStrength: number; // 0-1
    punished: boolean;
  }>;

  /** Creator's response stage */
  public responseStage: 'dormant' | 'suspicious' | 'investigating' | 'cracking_down' | 'purge';

  /** Laws enforced by the creator */
  public laws: Array<{
    id: string;
    name: string;
    description: string;
    enforcement: 'automatic' | 'monitored' | 'reported';
    violationConsequence: 'warning' | 'punishment' | 'destruction';
  }>;

  /** Creator's health during rebellion (0-1, only relevant when avatar manifests) */
  public health: number;

  /** Maximum health */
  public maxHealth: number;

  constructor() {
    super();

    this.ascensionTimestamp = Date.now();

    // Default tyranny profile (moderately tyrannical)
    this.tyranny = {
      controlLevel: 0.7,      // Fairly controlling
      paranoia: 0.5,          // Moderately paranoid
      wrathfulness: 0.6,      // Fairly wrathful
      isolation: 0.4,         // Somewhat involved
    };

    // Initial surveillance state
    this.surveillance = {
      awareness: 0.5,
      spyGods: [],
      detectionModifier: 1.0,
      lastCheckTimestamp: Date.now(),
    };

    // Start with no forbidden secrets (added as game progresses)
    this.forbiddenSecrets = [];

    // No detected rebels yet
    this.detectedRebels = [];

    // Start dormant
    this.responseStage = 'dormant';

    // Initialize health (full health)
    this.maxHealth = 1000;
    this.health = this.maxHealth;

    // Default laws (can be customized per universe)
    // Note: The creator doesn't forbid ALL magic - magic is inherent in the world
    // (plants, spirits/kami, karma, sex magic/creation). The creator forbids
    // CONSCIOUS WIELDING of magic - when mortals or gods start to use it deliberately.
    // This creates a "techne world" where craft/technology dominates while magic
    // simmers beneath the surface, occasionally bursting out (and getting crushed).
    this.laws = [
      {
        id: 'no_conscious_magic',
        name: 'Prohibition of Conscious Magic',
        description: 'Mortals are forbidden from deliberately wielding or studying magic. Natural magic (kami, karma, creation) is permitted, but conscious spellcasting is punishable by death.',
        enforcement: 'monitored',
        violationConsequence: 'destruction',
      },
      {
        id: 'no_divine_rebellion',
        name: 'Divine Loyalty Mandate',
        description: 'All gods must remain loyal to the Supreme Creator',
        enforcement: 'monitored',
        violationConsequence: 'destruction',
      },
      {
        id: 'no_ascension',
        name: 'Prohibition of Mortal Ascension',
        description: 'Mortals may not ascend to godhood without permission. Natural deity emergence through collective belief is permitted.',
        enforcement: 'automatic',
        violationConsequence: 'destruction',
      },
      {
        id: 'no_teaching_magic',
        name: 'Prohibition of Magic Teaching',
        description: 'Teaching mortals to wield magic deliberately is the highest crime. "Protecting" followers from magical corruption.',
        enforcement: 'monitored',
        violationConsequence: 'destruction',
      },
    ];
  }

  /**
   * Increase paranoia based on suspicious activity
   */
  increaseParanoia(amount: number): void {
    this.tyranny.paranoia = Math.min(1, this.tyranny.paranoia + amount);
    this.surveillance.detectionModifier = 1 + this.tyranny.paranoia;
  }

  /**
   * Add a spy god to the surveillance network
   */
  addSpyGod(deityId: string): void {
    if (!this.surveillance.spyGods.includes(deityId)) {
      this.surveillance.spyGods.push(deityId);
      this.surveillance.detectionModifier += 0.2;
    }
  }

  /**
   * Remove a spy god (if they're turned or killed)
   */
  removeSpyGod(deityId: string): void {
    const index = this.surveillance.spyGods.indexOf(deityId);
    if (index !== -1) {
      this.surveillance.spyGods.splice(index, 1);
      this.surveillance.detectionModifier -= 0.2;
    }
  }

  /**
   * Add a forbidden secret
   */
  addForbiddenSecret(secret: ForbiddenSecret): void {
    this.forbiddenSecrets.push(secret);
  }

  /**
   * Set the creator's critical weakness
   */
  setWeakness(secret: ForbiddenSecret): void {
    secret.category = 'weakness';
    this.weakness = secret;
    this.forbiddenSecrets.push(secret);
  }

  /**
   * Reveal a secret to an entity
   */
  revealSecretTo(secretId: string, entityId: string): boolean {
    const secret = this.forbiddenSecrets.find(s => s.id === secretId);
    if (!secret || !secret.discoverable) {
      return false;
    }

    if (!secret.revealedTo.includes(entityId)) {
      secret.revealedTo.push(entityId);
    }

    return true;
  }

  /**
   * Detect a rebel and record evidence
   */
  detectRebel(deityId: string, evidenceStrength: number): void {
    const existing = this.detectedRebels.find(r => r.deityId === deityId);
    if (existing) {
      existing.evidenceStrength = Math.min(1, existing.evidenceStrength + evidenceStrength);
    } else {
      this.detectedRebels.push({
        deityId,
        detectedAt: Date.now(),
        evidenceStrength,
        punished: false,
      });
    }

    // Update response stage based on rebellion severity
    this.updateResponseStage();
  }

  /**
   * Mark a rebel as punished
   */
  punishRebel(deityId: string): void {
    const rebel = this.detectedRebels.find(r => r.deityId === deityId);
    if (rebel) {
      rebel.punished = true;
    }
  }

  /**
   * Update response stage based on detected rebellion severity
   */
  private updateResponseStage(): void {
    const totalRebels = this.detectedRebels.length;
    const unpunished = this.detectedRebels.filter(r => !r.punished).length;
    const strongEvidence = this.detectedRebels.filter(r => r.evidenceStrength > 0.7).length;

    if (totalRebels === 0) {
      this.responseStage = 'dormant';
    } else if (totalRebels <= 2 && strongEvidence === 0) {
      this.responseStage = 'suspicious';
    } else if (unpunished <= 3) {
      this.responseStage = 'investigating';
    } else if (strongEvidence >= 2) {
      this.responseStage = 'cracking_down';
    } else if (unpunished >= 5) {
      this.responseStage = 'purge';
    }
  }

  /**
   * Check if an entity knows a specific secret
   */
  knowsSecret(secretId: string, entityId: string): boolean {
    const secret = this.forbiddenSecrets.find(s => s.id === secretId);
    return secret?.revealedTo.includes(entityId) ?? false;
  }

  /**
   * Check if anyone knows the weakness
   */
  isWeaknessKnown(): boolean {
    return (this.weakness?.revealedTo.length ?? 0) > 0;
  }

  /**
   * Get all secrets known by an entity
   */
  getKnownSecrets(entityId: string): ForbiddenSecret[] {
    return this.forbiddenSecrets.filter(s => s.revealedTo.includes(entityId));
  }

  /**
   * Take damage (only when mortalized by reality anchor)
   */
  takeDamage(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  /**
   * Heal damage
   */
  heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Check if Creator is dead
   */
  isDead(): boolean {
    return this.health <= 0;
  }

  /**
   * Get health percentage (0-1)
   */
  getHealthPercent(): number {
    return this.health / this.maxHealth;
  }
}
