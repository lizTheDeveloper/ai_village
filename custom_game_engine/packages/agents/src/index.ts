/**
 * Agents Package
 *
 * Provides agent creation functions that depend on both core and reproduction packages.
 * This package breaks the circular dependency between world and reproduction.
 */

export { createWanderingAgent, createLLMAgent } from './AgentEntity.js';
