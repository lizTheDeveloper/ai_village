/**
 * TVAdvertisingSystem - Advertising revenue and sponsor management
 *
 * Handles:
 * - Ad slot sales and pricing
 * - Sponsor relationships
 * - Commercial break scheduling
 * - Revenue calculation based on ratings
 * - Product placement deals
 */

import type { System } from '../../ecs/System.js';
import type { World } from '../../ecs/World.js';
import type { Entity } from '../../ecs/Entity.js';
import type { EventBus } from '../../events/EventBus.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { ComponentType } from '../../types/ComponentType.js';

// ============================================================================
// ADVERTISING TYPES
// ============================================================================

export type AdType =
  | 'commercial'       // Traditional 30-60 second spot
  | 'infomercial'      // Extended product showcase
  | 'sponsorship'      // "Brought to you by..."
  | 'product_placement' // In-show integration
  | 'bumper';          // Short station ID with sponsor

export type AdCategory =
  | 'food'
  | 'beverage'
  | 'household'
  | 'entertainment'
  | 'services'
  | 'technology'
  | 'fashion'
  | 'automotive'
  | 'healthcare'
  | 'financial';

export interface Advertisement {
  id: string;
  sponsorId: string;
  sponsorName: string;
  productName: string;
  type: AdType;
  category: AdCategory;

  /** Duration in ticks */
  durationTicks: number;

  /** Cost per airing */
  costPerAiring: number;

  /** Target demographics */
  targetAudience: string[];

  /** Creative quality affects effectiveness */
  creativeQuality: number; // 0-100

  /** Jingle/catchphrase that might spread */
  catchphrase?: string;
  jingle?: string;

  /** Performance metrics */
  totalAirings: number;
  totalImpressions: number;
  effectivenessScore: number;
}

export interface AdSlot {
  id: string;
  stationId: string;
  showId?: string;

  /** Time slot details */
  dayOfWeek: number; // 0-6
  hour: number;
  minute: number;

  /** Slot characteristics */
  isPrimeTime: boolean;
  basePrice: number;
  duration: number; // ticks

  /** Current booking */
  bookedAdId?: string;
  bookedUntilTick?: number;
}

export interface Sponsor {
  id: string;
  name: string;
  category: AdCategory;
  budget: number;
  spentThisSeason: number;

  /** Relationship with station */
  relationshipScore: number; // 0-100
  exclusivityDeal: boolean;

  /** Active advertisements */
  activeAds: string[];

  /** Preferred shows/slots */
  preferredShows: string[];
  preferredTimeSlots: string[];

  /** Performance tracking */
  totalInvestment: number;
  estimatedROI: number;
}

export interface SponsorshipDeal {
  id: string;
  sponsorId: string;
  showId: string;
  stationId: string;

  /** Deal terms */
  dealType: 'title' | 'presenting' | 'segment' | 'product_placement';
  totalValue: number;
  episodesRemaining: number;

  /** What they get */
  openingMention: boolean;
  closingMention: boolean;
  segmentNaming?: string;
  productPlacementScenes: number;

  /** Status */
  status: 'negotiating' | 'active' | 'completed' | 'cancelled';
  signedTick: number;
  expirationTick: number;
}

export interface CommercialBreak {
  id: string;
  showId: string;
  episodeNumber: number;
  breakNumber: number;

  /** Timing */
  scheduledTick: number;
  durationTicks: number;

  /** Ads in this break */
  adSlots: {
    adId: string;
    order: number;
    duration: number;
  }[];

  /** Performance */
  viewerRetention: number; // % who stayed through break
  executed: boolean;
}

// ============================================================================
// ADVERTISING MANAGER
// ============================================================================

export class AdvertisingManager {
  private events!: SystemEventManager;

  private advertisements: Map<string, Advertisement> = new Map();
  private sponsors: Map<string, Sponsor> = new Map();
  private adSlots: Map<string, AdSlot> = new Map();
  private sponsorshipDeals: Map<string, SponsorshipDeal> = new Map();
  private commercialBreaks: Map<string, CommercialBreak> = new Map();

  /** Revenue tracking by station */
  private stationRevenue: Map<string, number> = new Map();

  setEventBus(eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, 'tv_advertising_manager');
  }

  // ============================================================================
  // SPONSOR MANAGEMENT
  // ============================================================================

  registerSponsor(
    name: string,
    category: AdCategory,
    budget: number
  ): Sponsor {
    const sponsor: Sponsor = {
      id: `sponsor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      category,
      budget,
      spentThisSeason: 0,
      relationshipScore: 50,
      exclusivityDeal: false,
      activeAds: [],
      preferredShows: [],
      preferredTimeSlots: [],
      totalInvestment: 0,
      estimatedROI: 0,
    };

    this.sponsors.set(sponsor.id, sponsor);
    return sponsor;
  }

  getSponsor(sponsorId: string): Sponsor | undefined {
    return this.sponsors.get(sponsorId);
  }

  updateSponsorBudget(sponsorId: string, newBudget: number): boolean {
    const sponsor = this.sponsors.get(sponsorId);
    if (!sponsor) return false;
    sponsor.budget = newBudget;
    return true;
  }

  // ============================================================================
  // ADVERTISEMENT CREATION
  // ============================================================================

  createAdvertisement(
    sponsorId: string,
    productName: string,
    type: AdType,
    category: AdCategory,
    durationSeconds: number,
    costPerAiring: number,
    creativeQuality: number
  ): Advertisement | null {
    const sponsor = this.sponsors.get(sponsorId);
    if (!sponsor) return null;

    const ad: Advertisement = {
      id: `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sponsorId,
      sponsorName: sponsor.name,
      productName,
      type,
      category,
      durationTicks: durationSeconds * 20, // 20 ticks per second
      costPerAiring,
      targetAudience: [],
      creativeQuality: Math.max(0, Math.min(100, creativeQuality)),
      totalAirings: 0,
      totalImpressions: 0,
      effectivenessScore: 50,
    };

    this.advertisements.set(ad.id, ad);
    sponsor.activeAds.push(ad.id);

    this.events.emitGeneric('tv:ad:created', {
      adId: ad.id,
      sponsorName: sponsor.name,
      productName,
      type,
    }, sponsorId);

    return ad;
  }

  setAdCatchphrase(adId: string, catchphrase: string): boolean {
    const ad = this.advertisements.get(adId);
    if (!ad) return false;
    ad.catchphrase = catchphrase;
    return true;
  }

  setAdJingle(adId: string, jingle: string): boolean {
    const ad = this.advertisements.get(adId);
    if (!ad) return false;
    ad.jingle = jingle;
    return true;
  }

  // ============================================================================
  // AD SLOT MANAGEMENT
  // ============================================================================

  createAdSlot(
    stationId: string,
    dayOfWeek: number,
    hour: number,
    minute: number,
    durationSeconds: number,
    basePrice: number,
    showId?: string
  ): AdSlot {
    const isPrimeTime = hour >= 19 && hour <= 22;

    const slot: AdSlot = {
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      stationId,
      showId,
      dayOfWeek,
      hour,
      minute,
      isPrimeTime,
      basePrice: isPrimeTime ? basePrice * 2 : basePrice,
      duration: durationSeconds * 20,
    };

    this.adSlots.set(slot.id, slot);
    return slot;
  }

  bookAdSlot(
    slotId: string,
    adId: string,
    durationTicks: number,
    currentTick: number
  ): boolean {
    const slot = this.adSlots.get(slotId);
    const ad = this.advertisements.get(adId);

    if (!slot || !ad) return false;
    if (slot.bookedAdId && slot.bookedUntilTick && slot.bookedUntilTick > currentTick) {
      return false; // Already booked
    }

    // Check sponsor budget
    const sponsor = this.sponsors.get(ad.sponsorId);
    if (!sponsor || sponsor.budget - sponsor.spentThisSeason < slot.basePrice) {
      return false; // Insufficient budget
    }

    slot.bookedAdId = adId;
    slot.bookedUntilTick = currentTick + durationTicks;

    // Deduct from budget
    sponsor.spentThisSeason += slot.basePrice;
    sponsor.totalInvestment += slot.basePrice;

    // Add revenue to station
    const currentRevenue = this.stationRevenue.get(slot.stationId) ?? 0;
    this.stationRevenue.set(slot.stationId, currentRevenue + slot.basePrice);

    this.events.emitGeneric('tv:ad:slot_booked', {
      slotId,
      adId,
      sponsorId: ad.sponsorId,
      price: slot.basePrice,
      isPrimeTime: slot.isPrimeTime,
    }, slot.stationId);

    return true;
  }

  getAvailableSlots(stationId: string, currentTick: number): AdSlot[] {
    return Array.from(this.adSlots.values()).filter(slot => {
      if (slot.stationId !== stationId) return false;
      if (!slot.bookedAdId) return true;
      if (!slot.bookedUntilTick || slot.bookedUntilTick <= currentTick) return true;
      return false;
    });
  }

  // ============================================================================
  // SPONSORSHIP DEALS
  // ============================================================================

  proposeSponsorshipDeal(
    sponsorId: string,
    showId: string,
    stationId: string,
    dealType: SponsorshipDeal['dealType'],
    totalValue: number,
    episodes: number,
    currentTick: number
  ): SponsorshipDeal | null {
    const sponsor = this.sponsors.get(sponsorId);
    if (!sponsor) return null;

    if (sponsor.budget - sponsor.spentThisSeason < totalValue) {
      return null; // Insufficient budget
    }

    const deal: SponsorshipDeal = {
      id: `deal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sponsorId,
      showId,
      stationId,
      dealType,
      totalValue,
      episodesRemaining: episodes,
      openingMention: dealType === 'title' || dealType === 'presenting',
      closingMention: true,
      productPlacementScenes: dealType === 'product_placement' ? 3 : 0,
      status: 'negotiating',
      signedTick: currentTick,
      expirationTick: currentTick + episodes * 20 * 60 * 45, // ~45 min per episode
    };

    this.sponsorshipDeals.set(deal.id, deal);
    return deal;
  }

  acceptSponsorshipDeal(dealId: string): boolean {
    const deal = this.sponsorshipDeals.get(dealId);
    if (!deal || deal.status !== 'negotiating') return false;

    const sponsor = this.sponsors.get(deal.sponsorId);
    if (!sponsor) return false;

    deal.status = 'active';

    // Deduct from budget
    sponsor.spentThisSeason += deal.totalValue;
    sponsor.totalInvestment += deal.totalValue;

    // Improve relationship
    sponsor.relationshipScore = Math.min(100, sponsor.relationshipScore + 10);

    // Add revenue to station
    const currentRevenue = this.stationRevenue.get(deal.stationId) ?? 0;
    this.stationRevenue.set(deal.stationId, currentRevenue + deal.totalValue);

    this.events.emitGeneric('tv:sponsorship:accepted', {
      dealId,
      sponsorId: deal.sponsorId,
      sponsorName: sponsor.name,
      showId: deal.showId,
      dealType: deal.dealType,
      value: deal.totalValue,
    }, deal.stationId);

    return true;
  }

  // ============================================================================
  // COMMERCIAL BREAKS
  // ============================================================================

  scheduleCommercialBreak(
    showId: string,
    episodeNumber: number,
    breakNumber: number,
    scheduledTick: number,
    durationTicks: number
  ): CommercialBreak {
    const breakId = `break_${showId}_e${episodeNumber}_b${breakNumber}`;

    const commercialBreak: CommercialBreak = {
      id: breakId,
      showId,
      episodeNumber,
      breakNumber,
      scheduledTick,
      durationTicks,
      adSlots: [],
      viewerRetention: 100,
      executed: false,
    };

    this.commercialBreaks.set(breakId, commercialBreak);
    return commercialBreak;
  }

  addAdToBreak(breakId: string, adId: string): boolean {
    const commercialBreak = this.commercialBreaks.get(breakId);
    const ad = this.advertisements.get(adId);

    if (!commercialBreak || !ad || commercialBreak.executed) return false;

    // Check if there's room
    const currentDuration = commercialBreak.adSlots.reduce((sum, s) => sum + s.duration, 0);
    if (currentDuration + ad.durationTicks > commercialBreak.durationTicks) {
      return false;
    }

    commercialBreak.adSlots.push({
      adId,
      order: commercialBreak.adSlots.length,
      duration: ad.durationTicks,
    });

    return true;
  }

  executeCommercialBreak(
    breakId: string,
    currentViewers: number,
    _currentTick: number
  ): number {
    const commercialBreak = this.commercialBreaks.get(breakId);
    if (!commercialBreak || commercialBreak.executed) return 0;

    commercialBreak.executed = true;

    // Viewer retention decreases with more ads and lower quality
    let retention = 100;
    let totalRevenue = 0;

    for (const slot of commercialBreak.adSlots) {
      const ad = this.advertisements.get(slot.adId);
      if (!ad) continue;

      // Calculate impressions (viewers who saw the ad)
      const impressions = Math.floor(currentViewers * (retention / 100));
      ad.totalAirings++;
      ad.totalImpressions += impressions;

      // Update effectiveness based on creative quality and reach
      ad.effectivenessScore = (ad.effectivenessScore * 0.9) +
        (ad.creativeQuality * impressions / currentViewers * 0.1);

      // Revenue for this airing
      totalRevenue += ad.costPerAiring;

      // Retention drops with each ad, mitigated by quality
      const qualityFactor = ad.creativeQuality / 100;
      retention *= 0.95 + (qualityFactor * 0.04); // 95-99% retention per ad
    }

    commercialBreak.viewerRetention = retention;

    this.events.emitGeneric('tv:commercial_break:executed', {
      breakId,
      adsShown: commercialBreak.adSlots.length,
      totalImpressions: currentViewers,
      viewerRetention: retention,
      revenue: totalRevenue,
    }, commercialBreak.showId);

    return totalRevenue;
  }

  // ============================================================================
  // REVENUE QUERIES
  // ============================================================================

  getStationRevenue(stationId: string): number {
    return this.stationRevenue.get(stationId) ?? 0;
  }

  getAdPerformance(adId: string): { airings: number; impressions: number; effectiveness: number } | null {
    const ad = this.advertisements.get(adId);
    if (!ad) return null;

    return {
      airings: ad.totalAirings,
      impressions: ad.totalImpressions,
      effectiveness: ad.effectivenessScore,
    };
  }

  getSponsorROI(sponsorId: string): number {
    const sponsor = this.sponsors.get(sponsorId);
    if (!sponsor || sponsor.totalInvestment === 0) return 0;

    // Calculate estimated ROI based on ad effectiveness
    let totalEffectiveness = 0;
    for (const adId of sponsor.activeAds) {
      const ad = this.advertisements.get(adId);
      if (ad) {
        totalEffectiveness += ad.effectivenessScore * ad.totalImpressions;
      }
    }

    // Simple ROI estimation
    sponsor.estimatedROI = (totalEffectiveness / sponsor.totalInvestment) * 100;
    return sponsor.estimatedROI;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  cleanup(): void {
    this.advertisements.clear();
    this.sponsors.clear();
    this.adSlots.clear();
    this.sponsorshipDeals.clear();
    this.commercialBreaks.clear();
    this.stationRevenue.clear();
    this.events.cleanup();
  }
}

// ============================================================================
// TV ADVERTISING SYSTEM
// ============================================================================

export class TVAdvertisingSystem implements System {
  readonly id = 'TVAdvertisingSystem';
  readonly priority = 68;
  readonly requiredComponents = [ComponentType.TVStation] as const;

  private manager = new AdvertisingManager();
  private lastUpdateTick = 0;

  private static readonly UPDATE_INTERVAL = 20 * 60; // Every minute

  initialize(_world: World, eventBus: EventBus): void {
    this.manager.setEventBus(eventBus);
  }

  getManager(): AdvertisingManager {
    return this.manager;
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdateTick < TVAdvertisingSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Could add automatic sponsor AI here
  }

  cleanup(): void {
    this.manager.cleanup();
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let advertisingSystemInstance: TVAdvertisingSystem | null = null;

export function getTVAdvertisingSystem(): TVAdvertisingSystem {
  if (!advertisingSystemInstance) {
    advertisingSystemInstance = new TVAdvertisingSystem();
  }
  return advertisingSystemInstance;
}

export function resetTVAdvertisingSystem(): void {
  if (advertisingSystemInstance) {
    advertisingSystemInstance.cleanup();
  }
  advertisingSystemInstance = null;
}
