/**
 * Centralized research and content generation type definitions
 */

export type ResearchStatus = 'detected' | 'queued' | 'reviewing' | 'implementing' | 'deployed' | 'rejected';

export type ResearchContentType = 'item' | 'recipe' | 'building' | 'research';

export type ResearchType = 'predefined' | 'generated' | 'experimental';

export type ResearchMechanicType = 'action' | 'mechanic' | 'interaction' | 'content_type' | 'system';

export type UniverseIdentityType = 'player' | 'agent' | 'system' | 'llm' | 'imported';

export type UniverseAction = 'created' | 'modified' | 'imported' | 'blessed' | 'cursed' | 'forked';

export type TrustLevel = 'untrusted' | 'verified' | 'blessed' | 'official';
