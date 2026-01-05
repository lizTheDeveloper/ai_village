/**
 * Admin Module - Unified admin interface for both humans and LLMs
 *
 * Usage:
 *   import { capabilityRegistry, detectClient, renderDashboard } from './admin';
 *
 *   // Register a capability
 *   capabilityRegistry.register(myCapability);
 *
 *   // Detect client type from request
 *   const client = detectClient(req);
 *
 *   // Render appropriate view
 *   const html = renderDashboard(context);
 */

// Core registry
export {
  capabilityRegistry,
  defineCapability,
  defineAction,
  defineQuery,
  defineLink,
  type AdminCapability,
  type AdminAction,
  type AdminQuery,
  type AdminLink,
  type AdminParam,
  type ActionHandler,
  type QueryHandler,
  type ActionResult,
  type ViewContext,
  type CapabilityCategory,
  type ParamType,
} from './CapabilityRegistry.js';

// Client detection
export {
  detectClient,
  getContentType,
  type ClientType,
  type ClientInfo,
  type OutputFormat,
} from './ClientDetector.js';

// Renderers
export {
  renderDashboardText,
  renderCapabilityText,
  renderQueryResultText,
  renderActionResultText,
  renderErrorText,
  renderRegistryText,
} from './TextRenderer.js';

export {
  renderDashboardHtml,
  renderErrorHtml,
} from './HtmlRenderer.js';

// Admin router
export {
  createAdminRouter,
  type AdminRouterConfig,
} from './AdminRouter.js';

// Import and register built-in capabilities
import './capabilities/index.js';
