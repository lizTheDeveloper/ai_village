/**
 * Apps System
 *
 * Digital application ecosystem where inventors become wealthy and famous
 * based on user adoption. Like how Mark Zuckerberg became famous through
 * Facebook's billion+ users.
 *
 * Key features:
 * - App inventors gain fame proportional to user count (logarithmic)
 * - Wealth accumulates from ad revenue, subscriptions, etc.
 * - Platform fame: famous ON the platform you created
 * - Cultural impact through viral features, memes, catchphrases
 */

export {
  type AppCategory,
  type MonetizationModel,
  type App,
  type AppInventor,
  type AppUser,
  AppManager,
  getAppManager,
  resetAppManager,
  AppSystem,
  getAppSystem,
  resetAppSystem,
} from './AppSystem.js';
