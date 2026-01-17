/**
 * AppSystem - Digital application ecosystem
 *
 * Apps are created by inventors who become wealthy and famous based on user adoption.
 * Like Mark Zuckerberg with Facebook or Jack Dorsey with Twitter, app creators
 * gain fame proportional to their user base.
 *
 * Key mechanics:
 * - Inventors create apps
 * - User adoption drives wealth (ad revenue, subscriptions)
 * - Fame scales logarithmically with user count
 * - Platform fame: famous ON the platform you created
 * - Cultural impact through viral features
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';

// =============================================================================
// TYPES
// =============================================================================

export type AppCategory =
  | 'social'           // Social networking
  | 'messaging'        // Communication
  | 'entertainment'    // Games, media
  | 'productivity'     // Tools, utilities
  | 'commerce'         // Shopping, marketplace
  | 'education'        // Learning
  | 'health'           // Fitness, wellness
  | 'finance'          // Banking, investing
  | 'news'             // Information
  | 'dating';          // Romance

export type MonetizationModel =
  | 'free'             // No monetization
  | 'ads'              // Ad-supported
  | 'freemium'         // Free with paid features
  | 'subscription'     // Monthly/yearly fee
  | 'one_time'         // Single purchase
  | 'marketplace';     // Transaction fees

export interface App {
  id: string;
  name: string;
  description: string;
  category: AppCategory;
  monetization: MonetizationModel;

  // Inventor information
  inventorId: string;
  inventorName: string;
  createdAt: number;

  // User metrics
  totalUsers: number;
  activeUsers: number;        // Daily active users
  peakUsers: number;
  userGrowthRate: number;     // Users per day

  // Quality & engagement
  rating: number;             // 1-5 stars
  reviewCount: number;
  engagementScore: number;    // 0-100, how sticky the app is
  viralCoefficient: number;   // How likely users are to invite others

  // Revenue
  revenuePerUser: number;     // $ per user per month
  totalRevenue: number;
  inventorWealth: number;     // Accumulated inventor earnings

  // Cultural impact
  culturalPenetration: number; // 0-100, how mainstream it is
  iconicFeatures: string[];    // Features people talk about
  memes: string[];             // Memes spawned by the app
  catchphrases: string[];      // e.g., "swipe right"

  // Status
  status: 'development' | 'beta' | 'launched' | 'viral' | 'declining' | 'shutdown';
}

export interface AppInventor {
  agentId: string;
  agentName: string;

  // Apps created
  apps: string[];            // App IDs

  // Wealth from apps
  totalWealth: number;       // Accumulated earnings
  monthlyRevenue: number;    // Current monthly income
  wealthRank: number;        // Among all inventors

  // Fame from apps
  fameLevel: number;         // 0-100
  peakFame: number;
  platformFame: Map<string, number>; // Fame on each platform they created

  // Recognition
  mediaAppearances: number;
  awards: string[];
  controversies: number;
  publicApproval: number;    // -100 to 100

  // Status
  status: 'unknown' | 'indie_dev' | 'rising_star' | 'tech_mogul' | 'billionaire' | 'legend';
}

export interface AppUser {
  agentId: string;
  appId: string;
  joinedAt: number;
  lastActive: number;
  sessionCount: number;
  isPremium: boolean;
  spentAmount: number;
  invitedCount: number;      // Friends they brought to the app
}

// =============================================================================
// APP MANAGER
// =============================================================================

export class AppManager {
  private apps: Map<string, App> = new Map();
  private inventors: Map<string, AppInventor> = new Map();
  private users: Map<string, AppUser[]> = new Map(); // agentId -> apps they use
  private events!: SystemEventManager;

  // Revenue constants
  private static readonly AD_REVENUE_PER_USER = 0.05;      // $0.05 per user per month
  private static readonly SUBSCRIPTION_REVENUE = 10;       // $10 per subscriber per month
  private static readonly FREEMIUM_CONVERSION = 0.02;      // 2% of users pay
  private static readonly FREEMIUM_REVENUE = 5;            // $5 per paying user

  // Fame thresholds (users needed for fame levels)
  private static readonly FAME_THRESHOLDS = {
    indie_dev: 100,
    rising_star: 10000,
    tech_mogul: 1000000,
    billionaire: 100000000,
    legend: 1000000000,
  };

  setEventBus(eventBus: EventBus): void {
    this.events = new SystemEventManager(eventBus, 'AppSystem');
  }

  // ---------------------------------------------------------------------------
  // App Creation
  // ---------------------------------------------------------------------------

  createApp(
    inventorId: string,
    inventorName: string,
    name: string,
    description: string,
    category: AppCategory,
    monetization: MonetizationModel,
    currentTick: number
  ): App {
    const app: App = {
      id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      category,
      monetization,
      inventorId,
      inventorName,
      createdAt: currentTick,
      totalUsers: 0,
      activeUsers: 0,
      peakUsers: 0,
      userGrowthRate: 0,
      rating: 0,
      reviewCount: 0,
      engagementScore: 50,
      viralCoefficient: 0.1, // 10% of users invite 1 friend
      revenuePerUser: this.calculateRevenuePerUser(monetization),
      totalRevenue: 0,
      inventorWealth: 0,
      culturalPenetration: 0,
      iconicFeatures: [],
      memes: [],
      catchphrases: [],
      status: 'development',
    };

    this.apps.set(app.id, app);

    // Create or update inventor record
    this.ensureInventor(inventorId, inventorName);
    const inventor = this.inventors.get(inventorId)!;
    inventor.apps.push(app.id);

    this.events.emitGeneric('app:created', {
      appId: app.id,
      appName: name,
      inventorId,
      inventorName,
      category,
    }, inventorId);

    return app;
  }

  private calculateRevenuePerUser(model: MonetizationModel): number {
    switch (model) {
      case 'free':
        return 0;
      case 'ads':
        return AppManager.AD_REVENUE_PER_USER;
      case 'freemium':
        return AppManager.FREEMIUM_CONVERSION * AppManager.FREEMIUM_REVENUE;
      case 'subscription':
        return AppManager.SUBSCRIPTION_REVENUE;
      case 'one_time':
        return 2; // One-time purchases amortized
      case 'marketplace':
        return 0.5; // Transaction fee per user
      default:
        return 0;
    }
  }

  private ensureInventor(agentId: string, agentName: string): void {
    if (this.inventors.has(agentId)) return;

    const inventor: AppInventor = {
      agentId,
      agentName,
      apps: [],
      totalWealth: 0,
      monthlyRevenue: 0,
      wealthRank: 0,
      fameLevel: 0,
      peakFame: 0,
      platformFame: new Map(),
      mediaAppearances: 0,
      awards: [],
      controversies: 0,
      publicApproval: 50,
      status: 'unknown',
    };

    this.inventors.set(agentId, inventor);
  }

  // ---------------------------------------------------------------------------
  // App Lifecycle
  // ---------------------------------------------------------------------------

  launchApp(appId: string): boolean {
    const app = this.apps.get(appId);
    if (!app || app.status !== 'development') return false;

    app.status = 'launched';

    this.events.emitGeneric('app:launched', {
      appId,
      appName: app.name,
      inventorId: app.inventorId,
    }, appId);

    return true;
  }

  shutdownApp(appId: string): boolean {
    const app = this.apps.get(appId);
    if (!app) return false;

    app.status = 'shutdown';

    this.events.emitGeneric('app:shutdown', {
      appId,
      appName: app.name,
      finalUsers: app.totalUsers,
      totalRevenue: app.totalRevenue,
    }, appId);

    return true;
  }

  // ---------------------------------------------------------------------------
  // User Adoption
  // ---------------------------------------------------------------------------

  /**
   * Agent joins an app as a user
   * This drives inventor wealth and fame!
   */
  userJoinsApp(
    agentId: string,
    appId: string,
    currentTick: number,
    world?: World
  ): boolean {
    const app = this.apps.get(appId);
    if (!app || app.status === 'development' || app.status === 'shutdown') {
      return false;
    }

    // Check if already a user
    const existingUsers = this.users.get(agentId) || [];
    if (existingUsers.some((u) => u.appId === appId)) {
      return false;
    }

    // Create user record
    const user: AppUser = {
      agentId,
      appId,
      joinedAt: currentTick,
      lastActive: currentTick,
      sessionCount: 1,
      isPremium: false,
      spentAmount: 0,
      invitedCount: 0,
    };

    existingUsers.push(user);
    this.users.set(agentId, existingUsers);

    // Update app metrics
    app.totalUsers++;
    app.activeUsers++;
    if (app.totalUsers > app.peakUsers) {
      app.peakUsers = app.totalUsers;
    }

    // Check for viral status
    if (app.status === 'launched' && app.totalUsers > 10000 && app.userGrowthRate > 100) {
      app.status = 'viral';
      this.events.emitGeneric('app:went_viral', {
        appId,
        appName: app.name,
        totalUsers: app.totalUsers,
      }, appId);
    }

    // Update inventor wealth and fame
    this.updateInventorFromUserGrowth(app, world, currentTick);

    // Cultural penetration increases with users
    this.updateCulturalPenetration(app);

    // Create memory for joining a popular app
    if (world && app.totalUsers > 1000) {
      this.createAppJoinMemory(world, agentId, app, currentTick);
    }

    this.events.emitGeneric('app:user_joined', {
      appId,
      agentId,
      totalUsers: app.totalUsers,
      inventorId: app.inventorId,
    }, agentId);

    return true;
  }

  /**
   * Update inventor wealth and fame based on user growth
   * This is the core mechanic: more users = more wealth and fame
   */
  private updateInventorFromUserGrowth(app: App, world?: World, currentTick?: number): void {
    const inventor = this.inventors.get(app.inventorId);
    if (!inventor) return;

    // Calculate monthly revenue from all apps
    let totalMonthlyRevenue = 0;
    for (const appIdFromInventor of inventor.apps) {
      const inventorApp = this.apps.get(appIdFromInventor);
      if (inventorApp && inventorApp.status !== 'shutdown') {
        const monthlyAppRevenue = inventorApp.activeUsers * inventorApp.revenuePerUser;
        inventorApp.totalRevenue += monthlyAppRevenue / 30; // Daily portion
        inventorApp.inventorWealth += monthlyAppRevenue / 30;
        totalMonthlyRevenue += monthlyAppRevenue;
      }
    }

    // Update inventor wealth
    inventor.monthlyRevenue = totalMonthlyRevenue;
    inventor.totalWealth += totalMonthlyRevenue / 30; // Daily accumulation

    // Calculate fame from total users across all apps
    let totalUsers = 0;
    for (const appIdFromInventor of inventor.apps) {
      const inventorApp = this.apps.get(appIdFromInventor);
      if (inventorApp) {
        totalUsers += inventorApp.totalUsers;

        // Platform fame: famous on your own platform proportional to user count
        const platformFame = Math.min(100, Math.log10(1 + inventorApp.totalUsers) * 20);
        inventor.platformFame.set(inventorApp.id, platformFame);
      }
    }

    // Global fame scales logarithmically with users
    // 100 users = 10 fame, 10k = 40 fame, 1M = 60 fame, 100M = 80 fame, 1B = 100 fame
    const newFame = Math.min(100, Math.log10(1 + totalUsers) * 11);
    inventor.fameLevel = newFame;

    if (newFame > inventor.peakFame) {
      inventor.peakFame = newFame;
    }

    // Update status based on user thresholds
    this.updateInventorStatus(inventor, totalUsers);

    // Create fame milestone events
    if (world && currentTick) {
      this.checkFameMilestones(inventor, totalUsers, world, currentTick);
    }
  }

  private updateInventorStatus(inventor: AppInventor, totalUsers: number): void {
    const thresholds = AppManager.FAME_THRESHOLDS;

    if (totalUsers >= thresholds.legend) {
      inventor.status = 'legend';
    } else if (totalUsers >= thresholds.billionaire) {
      inventor.status = 'billionaire';
    } else if (totalUsers >= thresholds.tech_mogul) {
      inventor.status = 'tech_mogul';
    } else if (totalUsers >= thresholds.rising_star) {
      inventor.status = 'rising_star';
    } else if (totalUsers >= thresholds.indie_dev) {
      inventor.status = 'indie_dev';
    } else {
      inventor.status = 'unknown';
    }
  }

  private checkFameMilestones(
    inventor: AppInventor,
    totalUsers: number,
    world: World,
    currentTick: number
  ): void {
    const milestones = [100, 1000, 10000, 100000, 1000000, 10000000, 100000000, 1000000000];

    for (const milestone of milestones) {
      // Check if we just crossed this milestone
      const previousUsers = totalUsers - 1;
      if (previousUsers < milestone && totalUsers >= milestone) {
        this.events.emitGeneric('app:inventor_milestone', {
          inventorId: inventor.agentId,
          inventorName: inventor.agentName,
          milestone,
          fameLevel: inventor.fameLevel,
          status: inventor.status,
        }, inventor.agentId);

        // Create memory for inventor
        const inventorEntity = world.getEntity(inventor.agentId);
        if (inventorEntity) {
          this.createMilestoneMemory(inventorEntity, inventor, milestone, currentTick);
        }
      }
    }
  }

  private createMilestoneMemory(
    entity: Entity,
    inventor: AppInventor,
    milestone: number,
    currentTick: number
  ): void {
    const memory = entity.getComponent('episodic_memory') as EpisodicMemoryComponent | null;
    if (!memory) return;

    const formattedMilestone = milestone >= 1000000000
      ? `${milestone / 1000000000}B`
      : milestone >= 1000000
      ? `${milestone / 1000000}M`
      : milestone >= 1000
      ? `${milestone / 1000}K`
      : `${milestone}`;

    memory.formMemory({
      eventType: 'app:milestone_reached',
      summary: `My app reached ${formattedMilestone} users! I'm becoming ${inventor.status}`,
      timestamp: currentTick,
      emotionalValence: 0.9, // Very positive
      emotionalIntensity: 0.9, // Life-changing moment
      surprise: 0.7,
      novelty: 0.8,
      socialSignificance: 0.9, // Very significant achievement
      goalRelevance: 0.95, // Major life goal
      survivalRelevance: 0.3, // Financial security
      markedForConsolidation: true, // This memory should last forever
    });
  }

  private createAppJoinMemory(
    world: World,
    agentId: string,
    app: App,
    currentTick: number
  ): void {
    const entity = world.getEntity(agentId);
    if (!entity) return;

    const memory = entity.getComponent('episodic_memory') as EpisodicMemoryComponent | null;
    if (!memory) return;

    memory.formMemory({
      eventType: 'app:joined',
      summary: `Started using ${app.name} - everyone's talking about it`,
      timestamp: currentTick,
      emotionalValence: 0.4,
      emotionalIntensity: 0.3,
      surprise: 0.2,
      novelty: 0.5,
      socialSignificance: 0.6, // Joining what others use
      goalRelevance: 0.2,
      survivalRelevance: 0.0,
    });
  }

  private updateCulturalPenetration(app: App): void {
    // Cultural penetration is based on total users and engagement
    // More users + higher engagement = more cultural impact
    const userFactor = Math.log10(1 + app.totalUsers) * 10;
    const engagementFactor = app.engagementScore / 100;

    app.culturalPenetration = Math.min(100, userFactor * engagementFactor);
  }

  // ---------------------------------------------------------------------------
  // User Activity
  // ---------------------------------------------------------------------------

  userActivity(agentId: string, appId: string, currentTick: number): boolean {
    const userApps = this.users.get(agentId);
    if (!userApps) return false;

    const user = userApps.find((u) => u.appId === appId);
    if (!user) return false;

    user.lastActive = currentTick;
    user.sessionCount++;

    return true;
  }

  userInvitesFriend(
    inviterId: string,
    inviteeId: string,
    appId: string,
    currentTick: number,
    world?: World
  ): boolean {
    const userApps = this.users.get(inviterId);
    if (!userApps) return false;

    const user = userApps.find((u) => u.appId === appId);
    if (!user) return false;

    // Record the invite
    user.invitedCount++;

    // Actually add the friend
    const joined = this.userJoinsApp(inviteeId, appId, currentTick, world);

    if (joined) {
      const app = this.apps.get(appId);
      if (app) {
        app.viralCoefficient = Math.min(2.0, app.viralCoefficient + 0.01);
      }
    }

    return joined;
  }

  userGoesPremium(agentId: string, appId: string, amount: number): boolean {
    const userApps = this.users.get(agentId);
    if (!userApps) return false;

    const user = userApps.find((u) => u.appId === appId);
    if (!user || user.isPremium) return false;

    user.isPremium = true;
    user.spentAmount += amount;

    const app = this.apps.get(appId);
    if (app) {
      app.totalRevenue += amount;
      app.inventorWealth += amount * 0.7; // 70% goes to inventor

      const inventor = this.inventors.get(app.inventorId);
      if (inventor) {
        inventor.totalWealth += amount * 0.7;
      }
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Cultural Features
  // ---------------------------------------------------------------------------

  addIconicFeature(appId: string, featureName: string): boolean {
    const app = this.apps.get(appId);
    if (!app) return false;

    if (!app.iconicFeatures.includes(featureName)) {
      app.iconicFeatures.push(featureName);

      this.events.emitGeneric('app:iconic_feature', {
        appId,
        appName: app.name,
        feature: featureName,
      }, appId);
    }

    return true;
  }

  addCatchphrase(appId: string, catchphrase: string): boolean {
    const app = this.apps.get(appId);
    if (!app) return false;

    if (!app.catchphrases.includes(catchphrase)) {
      app.catchphrases.push(catchphrase);

      // Boost cultural penetration
      app.culturalPenetration = Math.min(100, app.culturalPenetration + 5);

      this.events.emitGeneric('app:catchphrase_emerged', {
        appId,
        appName: app.name,
        catchphrase,
      }, appId);
    }

    return true;
  }

  addMeme(appId: string, meme: string): boolean {
    const app = this.apps.get(appId);
    if (!app) return false;

    if (!app.memes.includes(meme)) {
      app.memes.push(meme);
      app.culturalPenetration = Math.min(100, app.culturalPenetration + 3);
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Ratings & Reviews
  // ---------------------------------------------------------------------------

  rateApp(appId: string, rating: number): boolean {
    const app = this.apps.get(appId);
    if (!app || rating < 1 || rating > 5) return false;

    const totalRating = app.rating * app.reviewCount + rating;
    app.reviewCount++;
    app.rating = totalRating / app.reviewCount;

    return true;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  getApp(appId: string): App | undefined {
    return this.apps.get(appId);
  }

  getInventor(agentId: string): AppInventor | undefined {
    return this.inventors.get(agentId);
  }

  getTopApps(limit: number = 10): App[] {
    return Array.from(this.apps.values())
      .filter((a) => a.status !== 'shutdown')
      .sort((a, b) => b.totalUsers - a.totalUsers)
      .slice(0, limit);
  }

  getTopInventors(limit: number = 10): AppInventor[] {
    return Array.from(this.inventors.values())
      .sort((a, b) => b.fameLevel - a.fameLevel)
      .slice(0, limit);
  }

  getWealthiestInventors(limit: number = 10): AppInventor[] {
    return Array.from(this.inventors.values())
      .sort((a, b) => b.totalWealth - a.totalWealth)
      .slice(0, limit);
  }

  getAppsByCategory(category: AppCategory): App[] {
    return Array.from(this.apps.values())
      .filter((a) => a.category === category && a.status !== 'shutdown');
  }

  getUserApps(agentId: string): App[] {
    const userApps = this.users.get(agentId) || [];
    return userApps
      .map((u) => this.apps.get(u.appId))
      .filter((a): a is App => a !== undefined);
  }

  /**
   * Get inventor's fame on a specific platform they created
   * Famous ON your own platform - like how Mark Zuckerberg is famous on Facebook
   */
  getInventorPlatformFame(inventorId: string, appId: string): number {
    const inventor = this.inventors.get(inventorId);
    if (!inventor) return 0;

    return inventor.platformFame.get(appId) ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Statistics
  // ---------------------------------------------------------------------------

  getStats(): {
    totalApps: number;
    totalUsers: number;
    totalRevenue: number;
    topInventor: { name: string; fame: number; status: string } | null;
    viralApps: number;
  } {
    let totalUsers = 0;
    let totalRevenue = 0;
    let viralApps = 0;

    for (const app of this.apps.values()) {
      totalUsers += app.totalUsers;
      totalRevenue += app.totalRevenue;
      if (app.status === 'viral') viralApps++;
    }

    const topInventors = this.getTopInventors(1);
    const topInventorData = topInventors[0];
    const topInventor = topInventorData
      ? {
          name: topInventorData.agentName,
          fame: topInventorData.fameLevel,
          status: topInventorData.status,
        }
      : null;

    return {
      totalApps: this.apps.size,
      totalUsers,
      totalRevenue,
      topInventor,
      viralApps,
    };
  }

  reset(): void {
    this.apps.clear();
    this.inventors.clear();
    this.users.clear();
    this.events.cleanup();
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let appManagerInstance: AppManager | null = null;

export function getAppManager(): AppManager {
  if (!appManagerInstance) {
    appManagerInstance = new AppManager();
  }
  return appManagerInstance;
}

export function resetAppManager(): void {
  if (appManagerInstance) {
    appManagerInstance.reset();
    appManagerInstance = null;
  }
}

// =============================================================================
// SYSTEM
// =============================================================================

export class AppSystem implements System {
  readonly id = 'AppSystem';
  readonly priority = 72;
  readonly requiredComponents = [] as const;

  private manager = getAppManager();
  private lastUpdateTick = 0;

  private static readonly UPDATE_INTERVAL = 20 * 60; // Every minute

  initialize(_world: World, eventBus: EventBus): void {
    this.manager.setEventBus(eventBus);
  }

  getManager(): AppManager {
    return this.manager;
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

    if (currentTick - this.lastUpdateTick < AppSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = currentTick;

    // Update active user counts and growth rates
    this.updateAppMetrics();

    // Process revenue
    this.processRevenue();
  }

  private updateAppMetrics(): void {
    for (const app of this.manager.getTopApps(100)) {
      // Simulate natural growth/decline
      if (app.status === 'viral') {
        // Viral apps grow exponentially
        const growth = Math.floor(app.activeUsers * app.viralCoefficient * 0.01);
        app.userGrowthRate = growth;
      } else if (app.status === 'launched') {
        // Normal apps grow slowly
        app.userGrowthRate = Math.floor(app.activeUsers * 0.001);
      } else if (app.status === 'declining') {
        // Declining apps lose users
        app.userGrowthRate = -Math.floor(app.activeUsers * 0.01);
      }

      // Update active users (simulate some churn)
      const churnRate = 0.02; // 2% monthly churn
      const dailyChurn = Math.floor(app.activeUsers * churnRate / 30);
      app.activeUsers = Math.max(0, app.activeUsers - dailyChurn + app.userGrowthRate);
    }
  }

  private processRevenue(): void {
    // Revenue is processed through updateInventorFromUserGrowth
    // This is called when users join, so we just need to handle ongoing revenue

    for (const inventor of this.manager.getTopInventors(100)) {
      // Daily revenue from all active apps
      let dailyRevenue = 0;

      for (const appId of inventor.apps) {
        const app = this.manager.getApp(appId);
        if (app && app.status !== 'shutdown') {
          const dailyAppRevenue = (app.activeUsers * app.revenuePerUser) / 30;
          app.totalRevenue += dailyAppRevenue;
          app.inventorWealth += dailyAppRevenue * 0.7; // 70% to inventor
          dailyRevenue += dailyAppRevenue * 0.7;
        }
      }

      inventor.totalWealth += dailyRevenue;
    }
  }

  cleanup(): void {
    resetAppManager();
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let appSystemInstance: AppSystem | null = null;

export function getAppSystem(): AppSystem {
  if (!appSystemInstance) {
    appSystemInstance = new AppSystem();
  }
  return appSystemInstance;
}

export function resetAppSystem(): void {
  if (appSystemInstance) {
    appSystemInstance.cleanup();
    appSystemInstance = null;
  }
}
