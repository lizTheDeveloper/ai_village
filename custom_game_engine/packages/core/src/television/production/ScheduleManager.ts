/**
 * ScheduleManager - Production scheduling and resource allocation
 *
 * Handles:
 * - Production calendar and timelines
 * - Resource booking (studios, equipment, crew)
 * - Conflict detection and resolution
 * - Schedule optimization
 * - Milestone tracking
 */

import type { EventBus } from '../../events/EventBus.js';

// ============================================================================
// SCHEDULE TYPES
// ============================================================================

export interface ProductionSchedule {
  id: string;
  showId: string;
  contentId: string;
  productionId: string;

  /** Schedule status */
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

  /** Timeline */
  plannedStartTick: number;
  plannedEndTick: number;
  actualStartTick?: number;
  actualEndTick?: number;

  /** Milestones */
  milestones: ScheduleMilestone[];

  /** Resource bookings */
  bookings: ResourceBooking[];

  /** Scheduled sessions */
  sessions: ScheduledSession[];

  /** Priority (higher = more important) */
  priority: number;

  /** Notes */
  notes: string;
}

export interface ScheduleMilestone {
  id: string;
  name: string;
  type: 'script_lock' | 'table_read' | 'first_day' | 'wrap' | 'rough_cut' | 'final_delivery';
  targetTick: number;
  completedTick?: number;
  status: 'pending' | 'on_track' | 'at_risk' | 'completed' | 'missed';
}

export interface ResourceBooking {
  id: string;
  resourceType: 'studio' | 'equipment' | 'location' | 'vehicle';
  resourceId: string;
  resourceName: string;
  startTick: number;
  endTick: number;
  status: 'tentative' | 'confirmed' | 'in_use' | 'completed' | 'cancelled';
  cost: number;
}

export interface ScheduledSession {
  id: string;
  type: 'filming' | 'recording' | 'editing' | 'review';
  sceneNumbers?: number[];
  startTick: number;
  endTick: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'rescheduled' | 'cancelled';

  /** Required personnel */
  requiredCast: string[];
  requiredCrew: string[];

  /** Location/studio */
  locationId?: string;
  studioId?: string;

  /** Notes */
  notes: string;
}

export interface ScheduleConflict {
  id: string;
  type: 'resource' | 'personnel' | 'timeline';
  severity: 'low' | 'medium' | 'high' | 'blocking';
  description: string;

  /** Affected schedules */
  affectedScheduleIds: string[];

  /** Conflicting resource/person */
  conflictingResourceId?: string;
  conflictingPersonId?: string;

  /** Suggested resolutions */
  suggestedResolutions: string[];

  /** Resolution status */
  status: 'unresolved' | 'resolving' | 'resolved' | 'ignored';
  resolution?: string;
}

export interface StudioResource {
  id: string;
  name: string;
  type: 'main_studio' | 'sound_stage' | 'editing_bay' | 'control_room';
  capacity: number; // Max crew
  equipment: string[];
  hourlyRate: number;
  availability: 'available' | 'booked' | 'maintenance';
}

export interface CrewAvailability {
  agentId: string;
  role: string;
  availableSlots: Array<{ startTick: number; endTick: number }>;
  bookedSlots: Array<{ startTick: number; endTick: number; productionId: string }>;
  maxHoursPerDay: number; // In game hours (ticks / 20 / 60)
}

// ============================================================================
// SCHEDULE MANAGER
// ============================================================================

export class ScheduleManager {
  private eventBus: EventBus | null = null;

  /** Active schedules by production ID */
  private schedules: Map<string, ProductionSchedule> = new Map();

  /** Active conflicts */
  private conflicts: Map<string, ScheduleConflict> = new Map();

  /** Studio resources */
  private studios: Map<string, StudioResource> = new Map();

  /** Crew availability */
  private crewAvailability: Map<string, CrewAvailability> = new Map();

  /** Ticks per game day */
  private readonly TICKS_PER_DAY = 20 * 60 * 24;

  setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  // ============================================================================
  // SCHEDULE MANAGEMENT
  // ============================================================================

  /**
   * Create a new production schedule
   */
  createSchedule(
    showId: string,
    contentId: string,
    productionId: string,
    plannedStartTick: number,
    estimatedDurationTicks: number,
    priority: number = 5
  ): ProductionSchedule {
    const schedule: ProductionSchedule = {
      id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      showId,
      contentId,
      productionId,
      status: 'draft',
      plannedStartTick,
      plannedEndTick: plannedStartTick + estimatedDurationTicks,
      milestones: this.generateDefaultMilestones(plannedStartTick, estimatedDurationTicks),
      bookings: [],
      sessions: [],
      priority,
      notes: '',
    };

    this.schedules.set(productionId, schedule);

    this.eventBus?.emit<'tv:schedule:created'>({
      type: 'tv:schedule:created',
      source: showId,
      data: {
        scheduleId: schedule.id,
        showId,
        productionId,
        plannedStartTick,
        plannedEndTick: schedule.plannedEndTick,
      },
    });

    return schedule;
  }

  /**
   * Generate default milestones for a production
   */
  private generateDefaultMilestones(
    startTick: number,
    durationTicks: number
  ): ScheduleMilestone[] {
    const milestones: ScheduleMilestone[] = [
      {
        id: `milestone_script`,
        name: 'Script Lock',
        type: 'script_lock',
        targetTick: startTick,
        status: 'pending',
      },
      {
        id: `milestone_table_read`,
        name: 'Table Read',
        type: 'table_read',
        targetTick: startTick + Math.floor(durationTicks * 0.1),
        status: 'pending',
      },
      {
        id: `milestone_first_day`,
        name: 'First Day of Production',
        type: 'first_day',
        targetTick: startTick + Math.floor(durationTicks * 0.2),
        status: 'pending',
      },
      {
        id: `milestone_wrap`,
        name: 'Production Wrap',
        type: 'wrap',
        targetTick: startTick + Math.floor(durationTicks * 0.6),
        status: 'pending',
      },
      {
        id: `milestone_rough_cut`,
        name: 'Rough Cut Complete',
        type: 'rough_cut',
        targetTick: startTick + Math.floor(durationTicks * 0.8),
        status: 'pending',
      },
      {
        id: `milestone_delivery`,
        name: 'Final Delivery',
        type: 'final_delivery',
        targetTick: startTick + durationTicks,
        status: 'pending',
      },
    ];

    return milestones;
  }

  /**
   * Confirm a schedule
   */
  confirmSchedule(productionId: string): boolean {
    const schedule = this.schedules.get(productionId);
    if (!schedule || schedule.status !== 'draft') return false;

    // Check for blocking conflicts
    const blockingConflicts = this.detectConflicts(schedule)
      .filter(c => c.severity === 'blocking');

    if (blockingConflicts.length > 0) {
      blockingConflicts.forEach(c => this.conflicts.set(c.id, c));
      return false;
    }

    schedule.status = 'confirmed';

    this.eventBus?.emit<'tv:schedule:confirmed'>({
      type: 'tv:schedule:confirmed',
      source: schedule.showId,
      data: {
        scheduleId: schedule.id,
        productionId,
      },
    });

    return true;
  }

  /**
   * Start production per schedule
   */
  startProduction(productionId: string, currentTick: number): boolean {
    const schedule = this.schedules.get(productionId);
    if (!schedule || schedule.status !== 'confirmed') return false;

    schedule.status = 'in_progress';
    schedule.actualStartTick = currentTick;

    // Update first day milestone
    const firstDayMilestone = schedule.milestones.find(m => m.type === 'first_day');
    if (firstDayMilestone) {
      firstDayMilestone.completedTick = currentTick;
      firstDayMilestone.status = 'completed';
    }

    this.eventBus?.emit<'tv:schedule:started'>({
      type: 'tv:schedule:started',
      source: schedule.showId,
      data: {
        scheduleId: schedule.id,
        productionId,
        actualStartTick: currentTick,
      },
    });

    return true;
  }

  /**
   * Complete production
   */
  completeProduction(productionId: string, currentTick: number): boolean {
    const schedule = this.schedules.get(productionId);
    if (!schedule || schedule.status !== 'in_progress') return false;

    schedule.status = 'completed';
    schedule.actualEndTick = currentTick;

    // Release all bookings
    schedule.bookings.forEach(booking => {
      booking.status = 'completed';
    });

    this.eventBus?.emit<'tv:schedule:completed'>({
      type: 'tv:schedule:completed',
      source: schedule.showId,
      data: {
        scheduleId: schedule.id,
        productionId,
        actualEndTick: currentTick,
        onSchedule: currentTick <= schedule.plannedEndTick,
      },
    });

    return true;
  }

  // ============================================================================
  // SESSION SCHEDULING
  // ============================================================================

  /**
   * Schedule a filming/recording session
   */
  scheduleSession(
    productionId: string,
    session: Omit<ScheduledSession, 'id' | 'status'>
  ): ScheduledSession | null {
    const schedule = this.schedules.get(productionId);
    if (!schedule) return null;

    const newSession: ScheduledSession = {
      ...session,
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'scheduled',
    };

    // Check for conflicts
    const conflicts = this.checkSessionConflicts(newSession, schedule);
    if (conflicts.length > 0) {
      conflicts.forEach(c => this.conflicts.set(c.id, c));
      // Still add but note conflicts
    }

    schedule.sessions.push(newSession);

    return newSession;
  }

  /**
   * Check for session conflicts
   */
  private checkSessionConflicts(
    session: ScheduledSession,
    schedule: ProductionSchedule
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    // Check personnel conflicts
    for (const personId of [...session.requiredCast, ...session.requiredCrew]) {
      const availability = this.crewAvailability.get(personId);
      if (!availability) continue;

      for (const booked of availability.bookedSlots) {
        if (this.timeRangesOverlap(
          session.startTick, session.endTick,
          booked.startTick, booked.endTick
        )) {
          conflicts.push({
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'personnel',
            severity: 'high',
            description: `${personId} is already booked for another production`,
            affectedScheduleIds: [schedule.id],
            conflictingPersonId: personId,
            suggestedResolutions: [
              'Reschedule session to different time',
              'Find replacement for this person',
              'Negotiate with other production',
            ],
            status: 'unresolved',
          });
        }
      }
    }

    // Check studio conflicts
    if (session.studioId) {
      const existingBooking = schedule.bookings.find(
        b => b.resourceId === session.studioId &&
             b.status !== 'cancelled' &&
             this.timeRangesOverlap(
               session.startTick, session.endTick,
               b.startTick, b.endTick
             )
      );

      if (!existingBooking) {
        // Check other schedules for this studio
        this.schedules.forEach((otherSchedule) => {
          if (otherSchedule.id === schedule.id) return;

          const conflictingBooking = otherSchedule.bookings.find(
            b => b.resourceId === session.studioId &&
                 b.status !== 'cancelled' &&
                 this.timeRangesOverlap(
                   session.startTick, session.endTick,
                   b.startTick, b.endTick
                 )
          );

          if (conflictingBooking) {
            conflicts.push({
              id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'resource',
              severity: 'blocking',
              description: `Studio ${session.studioId} is booked by another production`,
              affectedScheduleIds: [schedule.id, otherSchedule.id],
              conflictingResourceId: session.studioId,
              suggestedResolutions: [
                'Use a different studio',
                'Reschedule to available time slot',
                'Negotiate with other production',
              ],
              status: 'unresolved',
            });
          }
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if two time ranges overlap
   */
  private timeRangesOverlap(
    start1: number, end1: number,
    start2: number, end2: number
  ): boolean {
    return start1 < end2 && end1 > start2;
  }

  // ============================================================================
  // RESOURCE BOOKING
  // ============================================================================

  /**
   * Book a resource for a production
   */
  bookResource(
    productionId: string,
    resourceType: ResourceBooking['resourceType'],
    resourceId: string,
    resourceName: string,
    startTick: number,
    endTick: number,
    cost: number
  ): ResourceBooking | null {
    const schedule = this.schedules.get(productionId);
    if (!schedule) return null;

    // Check availability
    const isAvailable = this.isResourceAvailable(resourceId, startTick, endTick);
    if (!isAvailable) return null;

    const booking: ResourceBooking = {
      id: `booking_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      resourceType,
      resourceId,
      resourceName,
      startTick,
      endTick,
      status: 'tentative',
      cost,
    };

    schedule.bookings.push(booking);

    return booking;
  }

  /**
   * Confirm a resource booking
   */
  confirmBooking(productionId: string, bookingId: string): boolean {
    const schedule = this.schedules.get(productionId);
    if (!schedule) return false;

    const booking = schedule.bookings.find(b => b.id === bookingId);
    if (!booking || booking.status !== 'tentative') return false;

    booking.status = 'confirmed';
    return true;
  }

  /**
   * Check if resource is available
   */
  isResourceAvailable(resourceId: string, startTick: number, endTick: number): boolean {
    for (const schedule of this.schedules.values()) {
      for (const booking of schedule.bookings) {
        if (booking.resourceId === resourceId &&
            booking.status !== 'cancelled' &&
            this.timeRangesOverlap(startTick, endTick, booking.startTick, booking.endTick)) {
          return false;
        }
      }
    }
    return true;
  }

  // ============================================================================
  // CREW MANAGEMENT
  // ============================================================================

  /**
   * Register crew availability
   */
  registerCrewMember(
    agentId: string,
    role: string,
    availableSlots: Array<{ startTick: number; endTick: number }>
  ): void {
    this.crewAvailability.set(agentId, {
      agentId,
      role,
      availableSlots,
      bookedSlots: [],
      maxHoursPerDay: 12,
    });
  }

  /**
   * Book crew member for production
   */
  bookCrewMember(
    agentId: string,
    productionId: string,
    startTick: number,
    endTick: number
  ): boolean {
    const availability = this.crewAvailability.get(agentId);
    if (!availability) return false;

    // Check if available
    const isBooked = availability.bookedSlots.some(slot =>
      this.timeRangesOverlap(startTick, endTick, slot.startTick, slot.endTick)
    );

    if (isBooked) return false;

    availability.bookedSlots.push({ startTick, endTick, productionId });
    return true;
  }

  /**
   * Get available crew for a time slot
   */
  getAvailableCrew(
    role: string,
    startTick: number,
    endTick: number
  ): string[] {
    const available: string[] = [];

    this.crewAvailability.forEach((availability, agentId) => {
      if (availability.role !== role) return;

      const isBooked = availability.bookedSlots.some(slot =>
        this.timeRangesOverlap(startTick, endTick, slot.startTick, slot.endTick)
      );

      if (!isBooked) {
        available.push(agentId);
      }
    });

    return available;
  }

  // ============================================================================
  // STUDIO MANAGEMENT
  // ============================================================================

  /**
   * Register a studio resource
   */
  registerStudio(studio: StudioResource): void {
    this.studios.set(studio.id, studio);
  }

  /**
   * Get available studios for a time slot
   */
  getAvailableStudios(
    startTick: number,
    endTick: number,
    minCapacity: number = 0
  ): StudioResource[] {
    const available: StudioResource[] = [];

    this.studios.forEach((studio) => {
      if (studio.capacity < minCapacity) return;
      if (studio.availability === 'maintenance') return;

      const isAvailable = this.isResourceAvailable(studio.id, startTick, endTick);
      if (isAvailable) {
        available.push(studio);
      }
    });

    return available;
  }

  // ============================================================================
  // MILESTONE TRACKING
  // ============================================================================

  /**
   * Update milestone status
   */
  updateMilestone(
    productionId: string,
    milestoneType: ScheduleMilestone['type'],
    currentTick: number
  ): boolean {
    const schedule = this.schedules.get(productionId);
    if (!schedule) return false;

    const milestone = schedule.milestones.find(m => m.type === milestoneType);
    if (!milestone) return false;

    milestone.completedTick = currentTick;

    if (currentTick <= milestone.targetTick) {
      milestone.status = 'completed';
    } else {
      milestone.status = 'completed'; // Late but done
    }

    this.eventBus?.emit<'tv:milestone:completed'>({
      type: 'tv:milestone:completed',
      source: schedule.showId,
      data: {
        productionId,
        milestoneType,
        name: milestone.name,
        onTime: currentTick <= milestone.targetTick,
      },
    });

    return true;
  }

  /**
   * Check milestone status and update warnings
   */
  checkMilestones(productionId: string, currentTick: number): void {
    const schedule = this.schedules.get(productionId);
    if (!schedule) return;

    schedule.milestones.forEach(milestone => {
      if (milestone.status === 'completed') return;

      const timeRemaining = milestone.targetTick - currentTick;
      const warningThreshold = this.TICKS_PER_DAY * 2; // 2 days warning

      if (timeRemaining < 0) {
        milestone.status = 'missed';
      } else if (timeRemaining < warningThreshold) {
        milestone.status = 'at_risk';
      } else {
        milestone.status = 'on_track';
      }
    });
  }

  // ============================================================================
  // CONFLICT MANAGEMENT
  // ============================================================================

  /**
   * Detect conflicts for a schedule
   */
  detectConflicts(schedule: ProductionSchedule): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = [];

    // Check resource conflicts
    schedule.bookings.forEach(booking => {
      if (booking.status === 'cancelled') return;

      this.schedules.forEach((otherSchedule) => {
        if (otherSchedule.id === schedule.id) return;

        otherSchedule.bookings.forEach(otherBooking => {
          if (otherBooking.status === 'cancelled') return;
          if (otherBooking.resourceId !== booking.resourceId) return;

          if (this.timeRangesOverlap(
            booking.startTick, booking.endTick,
            otherBooking.startTick, otherBooking.endTick
          )) {
            conflicts.push({
              id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              type: 'resource',
              severity: schedule.priority > 5 ? 'blocking' : 'high',
              description: `Resource ${booking.resourceName} double-booked`,
              affectedScheduleIds: [schedule.id, otherSchedule.id],
              conflictingResourceId: booking.resourceId,
              suggestedResolutions: [
                'Adjust timing for one production',
                'Find alternative resource',
                'Prioritize based on schedule importance',
              ],
              status: 'unresolved',
            });
          }
        });
      });
    });

    return conflicts;
  }

  /**
   * Resolve a conflict
   */
  resolveConflict(conflictId: string, resolution: string): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;

    conflict.status = 'resolved';
    conflict.resolution = resolution;

    return true;
  }

  /**
   * Get unresolved conflicts for a production
   */
  getUnresolvedConflicts(productionId: string): ScheduleConflict[] {
    const schedule = this.schedules.get(productionId);
    if (!schedule) return [];

    return Array.from(this.conflicts.values())
      .filter(c =>
        c.status === 'unresolved' &&
        c.affectedScheduleIds.includes(schedule.id)
      );
  }

  // ============================================================================
  // QUERY METHODS
  // ============================================================================

  /**
   * Get schedule for a production
   */
  getSchedule(productionId: string): ProductionSchedule | null {
    return this.schedules.get(productionId) ?? null;
  }

  /**
   * Get all active schedules
   */
  getActiveSchedules(): ProductionSchedule[] {
    return Array.from(this.schedules.values())
      .filter(s => s.status === 'confirmed' || s.status === 'in_progress');
  }

  /**
   * Get schedules by show
   */
  getShowSchedules(showId: string): ProductionSchedule[] {
    return Array.from(this.schedules.values())
      .filter(s => s.showId === showId);
  }

  /**
   * Get sessions for a day
   */
  getSessionsForDay(targetTick: number): ScheduledSession[] {
    const dayStart = targetTick - (targetTick % this.TICKS_PER_DAY);
    const dayEnd = dayStart + this.TICKS_PER_DAY;

    const sessions: ScheduledSession[] = [];

    this.schedules.forEach(schedule => {
      schedule.sessions.forEach(session => {
        if (session.startTick >= dayStart && session.startTick < dayEnd) {
          sessions.push(session);
        }
      });
    });

    return sessions.sort((a, b) => a.startTick - b.startTick);
  }

  /**
   * Clear all data
   */
  cleanup(): void {
    this.schedules.clear();
    this.conflicts.clear();
    this.studios.clear();
    this.crewAvailability.clear();
    this.eventBus = null;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let scheduleManagerInstance: ScheduleManager | null = null;

export function getScheduleManager(): ScheduleManager {
  if (!scheduleManagerInstance) {
    scheduleManagerInstance = new ScheduleManager();
  }
  return scheduleManagerInstance;
}

export function resetScheduleManager(): void {
  if (scheduleManagerInstance) {
    scheduleManagerInstance.cleanup();
  }
  scheduleManagerInstance = null;
}
