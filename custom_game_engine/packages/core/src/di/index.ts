/**
 * Dependency Injection Module
 *
 * Provides a DI container for breaking circular dependencies between packages.
 * External packages register their implementations at app startup.
 */

export {
  container,
  type AgentFactory,
  type LLMServices,
  type WorldServices,
  type DIContainer,
} from './Container.js';
