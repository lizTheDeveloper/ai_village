/**
 * CastingSystem - Agent casting for TV roles
 *
 * Handles:
 * - Casting calls and auditions
 * - Talent evaluation and selection
 * - Contract negotiation
 * - Cast management and scheduling
 * - Understudies and replacements
 */

import type { EventBus } from '../../events/EventBus.js';
import type { ShowCharacter } from '../TVShow.js';

// ============================================================================
// CASTING TYPES
// ============================================================================

export interface CastingCall {
  id: string;
  showId: string;
  characterName: string;
  characterDescription: string;
  requirements: CastingRequirements;
  status: 'open' | 'auditioning' | 'cast' | 'cancelled';
  createdTick: number;
  deadline?: number;

  /** Submitted auditions */
  auditions: Audition[];

  /** Final cast member */
  castAgentId?: string;
}

export interface CastingRequirements {
  /** Required personality traits */
  personalityTraits: string[];

  /** Required skills */
  skills: string[];

  /** Age range (if applicable) */
  ageRange?: { min: number; max: number };

  /** Experience level required */
  experienceLevel: 'none' | 'some' | 'experienced' | 'veteran';

  /** Type of role */
  roleType: 'lead' | 'supporting' | 'recurring' | 'guest' | 'extra';

  /** Special requirements */
  specialRequirements?: string[];
}

export interface Audition {
  id: string;
  castingCallId: string;
  agentId: string;
  agentName: string;
  submittedTick: number;
  status: 'pending' | 'reviewed' | 'callback' | 'selected' | 'rejected';

  /** Performance score 0-100 */
  performanceScore: number;

  /** Chemistry score with existing cast 0-100 */
  chemistryScore: number;

  /** Fit score based on requirements 0-100 */
  fitScore: number;

  /** Notes from casting director */
  notes: string;
}

export interface ActorContract {
  id: string;
  agentId: string;
  showId: string;
  characterName: string;
  role: 'lead' | 'supporting' | 'recurring' | 'guest' | 'extra';

  /** Contract terms */
  episodesCommitted: number;
  seasonCommitted: number;
  compensation: number;

  /** Contract status */
  status: 'negotiating' | 'active' | 'expired' | 'terminated';
  signedTick: number;
  expirationTick: number;

  /** Options */
  hasOption: boolean; // Station can renew
  optionSeasons: number;
}

export interface CastMember {
  agentId: string;
  characterName: string;
  role: 'lead' | 'supporting' | 'recurring' | 'guest' | 'extra';
  contract: ActorContract;

  /** Performance history */
  episodesAppeared: number;
  averagePerformanceScore: number;
  audienceApproval: number;

  /** Availability */
  availability: 'available' | 'on_set' | 'unavailable';
  currentProductionId?: string;
}

// ============================================================================
// CASTING MANAGER
// ============================================================================

export class CastingManager {
  private eventBus: EventBus | null = null;

  /** Active casting calls */
  private castingCalls: Map<string, CastingCall> = new Map();

  /** Active contracts */
  private contracts: Map<string, ActorContract> = new Map();

  /** Cast by show */
  private showCasts: Map<string, CastMember[]> = new Map();

  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  // ============================================================================
  // CASTING CALLS
  // ============================================================================

  /**
   * Create a casting call for a character
   */
  createCastingCall(
    showId: string,
    character: ShowCharacter,
    requirements: Partial<CastingRequirements>,
    currentTick: number
  ): CastingCall {
    const fullRequirements: CastingRequirements = {
      personalityTraits: requirements.personalityTraits ?? [],
      skills: requirements.skills ?? ['acting'],
      experienceLevel: requirements.experienceLevel ?? 'some',
      roleType: requirements.roleType ?? 'supporting',
      ageRange: requirements.ageRange,
      specialRequirements: requirements.specialRequirements,
    };

    const call: CastingCall = {
      id: `casting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      showId,
      characterName: character.name,
      characterDescription: character.personality,
      requirements: fullRequirements,
      status: 'open',
      createdTick: currentTick,
      auditions: [],
    };

    this.castingCalls.set(call.id, call);

    this.eventBus?.emit({
      type: 'tv:casting:call_opened' as any,
      source: showId,
      data: {
        callId: call.id,
        showId,
        characterName: character.name,
        roleType: fullRequirements.roleType,
      },
    });

    return call;
  }

  /**
   * Submit an audition for a casting call
   */
  submitAudition(
    castingCallId: string,
    agentId: string,
    agentName: string,
    currentTick: number
  ): Audition | null {
    const call = this.castingCalls.get(castingCallId);
    if (!call || call.status !== 'open') return null;

    // Check if agent already auditioned
    if (call.auditions.some(a => a.agentId === agentId)) return null;

    // Evaluate the audition
    const scores = this.evaluateAudition(call, agentId);

    const audition: Audition = {
      id: `audition_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      castingCallId,
      agentId,
      agentName,
      submittedTick: currentTick,
      status: 'pending',
      performanceScore: scores.performance,
      chemistryScore: scores.chemistry,
      fitScore: scores.fit,
      notes: '',
    };

    call.auditions.push(audition);

    if (call.auditions.length >= 3) {
      call.status = 'auditioning';
    }

    this.eventBus?.emit({
      type: 'tv:casting:audition_submitted' as any,
      source: agentId,
      data: {
        auditionId: audition.id,
        callId: castingCallId,
        showId: call.showId,
        characterName: call.characterName,
      },
    });

    return audition;
  }

  /**
   * Evaluate an audition
   */
  private evaluateAudition(
    _call: CastingCall,
    _agentId: string
  ): { performance: number; chemistry: number; fit: number } {
    // Would query agent's skills and personality
    // For now, generate reasonable scores
    return {
      performance: 50 + Math.random() * 50,
      chemistry: 50 + Math.random() * 50,
      fit: 50 + Math.random() * 50,
    };
  }

  /**
   * Review auditions and make callbacks
   */
  reviewAuditions(castingCallId: string): Audition[] {
    const call = this.castingCalls.get(castingCallId);
    if (!call) return [];

    // Sort by combined score
    const sorted = [...call.auditions].sort((a, b) => {
      const scoreA = a.performanceScore + a.chemistryScore + a.fitScore;
      const scoreB = b.performanceScore + b.chemistryScore + b.fitScore;
      return scoreB - scoreA;
    });

    // Top 3 get callbacks
    const callbacks = sorted.slice(0, 3);
    callbacks.forEach(a => {
      a.status = 'callback';
    });

    // Rest are rejected
    sorted.slice(3).forEach(a => {
      a.status = 'rejected';
    });

    return callbacks;
  }

  /**
   * Cast an agent for a role
   */
  castRole(
    castingCallId: string,
    auditionId: string,
    currentTick: number
  ): ActorContract | null {
    const call = this.castingCalls.get(castingCallId);
    if (!call) return null;

    const audition = call.auditions.find(a => a.id === auditionId);
    if (!audition) return null;

    // Create contract
    const contract = this.createContract(
      audition.agentId,
      call.showId,
      call.characterName,
      call.requirements.roleType,
      currentTick
    );

    // Update audition
    audition.status = 'selected';

    // Update call
    call.status = 'cast';
    call.castAgentId = audition.agentId;

    // Reject other auditions
    call.auditions.filter(a => a.id !== auditionId).forEach(a => {
      if (a.status !== 'rejected') a.status = 'rejected';
    });

    // Add to show cast
    this.addToCast(call.showId, {
      agentId: audition.agentId,
      characterName: call.characterName,
      role: call.requirements.roleType,
      contract,
      episodesAppeared: 0,
      averagePerformanceScore: audition.performanceScore,
      audienceApproval: 50,
      availability: 'available',
    });

    this.eventBus?.emit({
      type: 'tv:casting:role_cast' as any,
      source: call.showId,
      data: {
        callId: castingCallId,
        showId: call.showId,
        characterName: call.characterName,
        agentId: audition.agentId,
        agentName: audition.agentName,
        roleType: call.requirements.roleType,
      },
    });

    return contract;
  }

  // ============================================================================
  // CONTRACTS
  // ============================================================================

  /**
   * Create an actor contract
   */
  createContract(
    agentId: string,
    showId: string,
    characterName: string,
    role: ActorContract['role'],
    currentTick: number
  ): ActorContract {
    // Base compensation by role
    const baseCompensation: Record<string, number> = {
      lead: 1000,
      supporting: 500,
      recurring: 300,
      guest: 100,
    };

    // Episodes by role
    const episodes: Record<string, number> = {
      lead: 10,
      supporting: 8,
      recurring: 4,
      guest: 1,
    };

    const ticksPerSeason = 20 * 60 * 24 * 30 * 3; // ~3 months per season

    const contract: ActorContract = {
      id: `contract_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      agentId,
      showId,
      characterName,
      role,
      episodesCommitted: episodes[role] ?? 4,
      seasonCommitted: 1,
      compensation: baseCompensation[role] ?? 200,
      status: 'active',
      signedTick: currentTick,
      expirationTick: currentTick + ticksPerSeason,
      hasOption: role === 'lead' || role === 'supporting',
      optionSeasons: role === 'lead' ? 3 : 1,
    };

    this.contracts.set(contract.id, contract);

    this.eventBus?.emit({
      type: 'tv:contract:signed' as any,
      source: showId,
      data: {
        contractId: contract.id,
        agentId,
        showId,
        characterName,
        role,
        compensation: contract.compensation,
      },
    });

    return contract;
  }

  /**
   * Renew a contract using option
   */
  renewContract(contractId: string, currentTick: number): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract || !contract.hasOption || contract.optionSeasons <= 0) return false;

    const ticksPerSeason = 20 * 60 * 24 * 30 * 3;

    contract.expirationTick = currentTick + ticksPerSeason;
    contract.seasonCommitted++;
    contract.optionSeasons--;
    contract.compensation = Math.round(contract.compensation * 1.15); // 15% raise

    this.eventBus?.emit({
      type: 'tv:contract:renewed' as any,
      source: contract.showId,
      data: {
        contractId,
        agentId: contract.agentId,
        newSeason: contract.seasonCommitted,
        newCompensation: contract.compensation,
      },
    });

    return true;
  }

  /**
   * Terminate a contract
   */
  terminateContract(contractId: string, reason: string): boolean {
    const contract = this.contracts.get(contractId);
    if (!contract || contract.status !== 'active') return false;

    contract.status = 'terminated';

    // Remove from show cast
    const cast = this.showCasts.get(contract.showId);
    if (cast) {
      const index = cast.findIndex(m => m.agentId === contract.agentId);
      if (index >= 0) cast.splice(index, 1);
    }

    this.eventBus?.emit({
      type: 'tv:contract:terminated' as any,
      source: contract.showId,
      data: {
        contractId,
        agentId: contract.agentId,
        showId: contract.showId,
        characterName: contract.characterName,
        reason,
      },
    });

    return true;
  }

  // ============================================================================
  // CAST MANAGEMENT
  // ============================================================================

  /**
   * Add a cast member to a show
   */
  private addToCast(showId: string, member: CastMember): void {
    let cast = this.showCasts.get(showId);
    if (!cast) {
      cast = [];
      this.showCasts.set(showId, cast);
    }

    cast.push(member);
  }

  /**
   * Get cast for a show
   */
  getShowCast(showId: string): CastMember[] {
    return this.showCasts.get(showId) ?? [];
  }

  /**
   * Get available cast for filming
   */
  getAvailableCast(showId: string): CastMember[] {
    return this.getShowCast(showId).filter(m => m.availability === 'available');
  }

  /**
   * Set cast member availability
   */
  setCastAvailability(
    showId: string,
    agentId: string,
    availability: CastMember['availability'],
    productionId?: string
  ): boolean {
    const cast = this.showCasts.get(showId);
    if (!cast) return false;

    const member = cast.find(m => m.agentId === agentId);
    if (!member) return false;

    member.availability = availability;
    member.currentProductionId = productionId;
    return true;
  }

  /**
   * Update cast member performance
   */
  updatePerformance(
    showId: string,
    agentId: string,
    performanceScore: number
  ): void {
    const cast = this.showCasts.get(showId);
    if (!cast) return;

    const member = cast.find(m => m.agentId === agentId);
    if (!member) return;

    member.episodesAppeared++;
    // Exponential moving average
    member.averagePerformanceScore =
      0.2 * performanceScore + 0.8 * member.averagePerformanceScore;
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get open casting calls for a show
   */
  getOpenCalls(showId: string): CastingCall[] {
    return Array.from(this.castingCalls.values())
      .filter(c => c.showId === showId && c.status === 'open');
  }

  /**
   * Get all casting calls
   */
  getAllCalls(): CastingCall[] {
    return Array.from(this.castingCalls.values());
  }

  /**
   * Get agent's contracts
   */
  getAgentContracts(agentId: string): ActorContract[] {
    return Array.from(this.contracts.values())
      .filter(c => c.agentId === agentId && c.status === 'active');
  }

  /**
   * Check if agent is available
   */
  isAgentAvailable(agentId: string): boolean {
    for (const cast of this.showCasts.values()) {
      const member = cast.find(m => m.agentId === agentId);
      if (member && member.availability !== 'available') {
        return false;
      }
    }
    return true;
  }

  /**
   * Clear all data
   */
  cleanup(): void {
    this.castingCalls.clear();
    this.contracts.clear();
    this.showCasts.clear();
    this.eventBus = null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let castingManagerInstance: CastingManager | null = null;

export function getCastingManager(): CastingManager {
  if (!castingManagerInstance) {
    castingManagerInstance = new CastingManager();
  }
  return castingManagerInstance;
}

export function resetCastingManager(): void {
  if (castingManagerInstance) {
    castingManagerInstance.cleanup();
  }
  castingManagerInstance = null;
}
