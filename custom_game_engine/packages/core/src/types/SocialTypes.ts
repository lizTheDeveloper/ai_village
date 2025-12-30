/**
 * Centralized social and relationship type definitions
 */

export type RelationshipTier = 'stranger' | 'acquaintance' | 'friend' | 'close_friend' | 'family';

export type BeliefType = 'character' | 'world' | 'social';

export type EvidenceType = 'accurate_claim' | 'false_claim' | 'observation' | 'experience';

export type VerificationResult = 'correct' | 'stale' | 'misidentified' | 'false_report' | 'unreliable';

export type ReflectionType = 'daily' | 'deep' | 'post_event' | 'idle';

export type PrayerUrgency = 'routine' | 'earnest' | 'desperate';
