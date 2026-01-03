# Social Media & Parasocial Relationships Specification

> **System:** communication-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

## Overview

Social media platforms where ensouled agents create and consume content, forming parasocial relationships with influencers and celebrities. Agents scroll during sleep, engage with content, and develop one-sided emotional attachments to content creators they've never met.

## Core Requirements

### Requirement 1: The Parasocial Economy

Social media creates parasocial relationships - where consumers feel deeply connected to creators who don't know they exist.

**Key Mechanics:**
- **City-spawned influencers**: Celebrity agents spawn in cities with established followings
- **Content creation**: Ensouled agents post photos, videos, thoughts, memes
- **Sleep-time scrolling**: Agents engage with social media during sleep/idle time
- **Parasocial bonds**: Agents form emotional attachments to creators
- **Algorithmic feeds**: Content curated based on engagement patterns
- **Platform economics**: Influencers monetize attention

### Requirement 2: Multiple Social Platforms

Support diverse platform types:
- **FriendFeed** (Facebook-like): Long posts, photos, life updates
- **SnapPic** (Instagram-like): Photo-focused, aesthetic content
- **Chirper** (Twitter-like): Short text, real-time discourse
- **ClipVid** (TikTok-like): Short videos, trends, dances
- **TubeWatch** (YouTube-like): Long-form video, tutorials
- **StreamLive** (Twitch-like): Live streaming
- **PinBoard** (Pinterest-like): Collections, inspiration
- **LinkNode** (LinkedIn-like): Professional networking

### Requirement 3: Parasocial Bond Distribution

Carefully balanced to prevent fan-zombie epidemic:

**Distribution per 500k followers:**
- Casual fans: ~450,000 (90%)
- Devoted followers: ~45,000 (9%)
- Superfans: ~4,500 (0.9%)
- Parasocial friends: ~450 (0.09%)
- Obsessive fans: ~5 (0.001%)

**Safeguards:**
- Diminishing returns on bond intensity gains
- Personality gating (only specific personalities can become obsessive)
- Rate limiting on obsessive behaviors
- Real duties (work, family, survival) override social media

### Requirement 4: Magic System Integration (Optional Endgame)

Magic can bypass safeguards and create terrifying social phenomena:
- **Mass Charm**: Force followers to superfan tier (bypasses personality gating)
- **Fan-Zombie Apocalypse**: FORBIDDEN spell creates literal obsessive zombies
- **Memetic Magic**: Content becomes infectious mental virus
- **Emotional Harvest**: Convert parasocial love into magical power
- **Divine Algorithm Control**: Gods manipulate feed algorithms
- **Viral Scandal Curse**: Fabricate career-ending scandals

## Implementation Files

> **Note:** This system is DRAFT - not yet implemented

**Planned Components:**
- `packages/core/src/components/SocialMediaComponent.ts` - Agent's social media presence
- `packages/core/src/components/ContentCreatorComponent.ts` - Influencer profiles
- `packages/core/src/components/SocialPostComponent.ts` - Individual posts
- `packages/core/src/components/ParasocialBondComponent.ts` - Fan-creator relationships
- `packages/core/src/components/MagicSocialMediaComponent.ts` - Magical effects

**Planned Systems:**
- `packages/core/src/systems/SleepScrollingSystem.ts` - Idle-time engagement
- `packages/core/src/systems/ContentGenerationSystem.ts` - LLM-powered post creation
- `packages/core/src/systems/ParasocialRelationshipSystem.ts` - Bond management
- `packages/core/src/systems/FeedAlgorithmSystem.ts` - Personalized feeds
- `packages/core/src/systems/InfluencerMonetizationSystem.ts` - Sponsorships
- `packages/core/src/systems/InfluencerSpawningSystem.ts` - City-spawned celebrities
- `packages/core/src/systems/MagicSocialMediaSystem.ts` - Magical manipulation

**Planned Types:**
- `packages/core/src/social/SocialPlatforms.ts` - Platform definitions
- `packages/core/src/social/InfluencerTemplates.ts` - Pre-made influencer templates

## Components

### Component: SocialMediaComponent
**Type:** `social_media`
**Purpose:** Tracks agent's social media activity and relationships

**Properties:**
- `accounts: Map<SocialPlatform, UserAccount>` - Platform accounts
- `following: string[]` - Creator IDs followed
- `followers: string[]` - Follower IDs
- `lastScrolled: number` - Last engagement time
- `totalScrollTime: number` - Total minutes scrolling
- `postsViewed: number` - Total posts seen
- `preferredPlatforms: SocialPlatform[]` - Platform preferences
- `parasocialBonds: Map<string, ParasocialBond>` - Creator relationships

### Component: ContentCreatorComponent
**Type:** `content_creator`
**Purpose:** Defines influencer profile and content style

**Properties:**
- `username: string` - Handle
- `displayName: string` - Public name
- `bio: string` - Profile description
- `platforms: Map<SocialPlatform, CreatorAccount>` - Platform presence
- `niche: ContentNiche` - lifestyle, comedy, cooking, etc.
- `contentThemes: string[]` - Content topics
- `totalFollowers: number` - Total followers across platforms
- `averageEngagementRate: number` - Likes/views ratio
- `influenceScore: number` - 0-100 reputation
- `sponsorships: Sponsorship[]` - Brand deals

### Component: SocialPostComponent
**Type:** `social_post`
**Purpose:** Individual piece of content

**Properties:**
- `postId: string` - Unique ID
- `platform: SocialPlatform` - Where posted
- `creatorId: string` - Author agent ID
- `contentType: ContentType` - text, photo, video, etc.
- `text: string` - Post content
- `mediaUrl: string` - Photo/video URL
- `tags: string[]` - Hashtags
- `likes: string[]` - Agent IDs who liked
- `comments: SocialComment[]` - Comment threads
- `shares: string[]` - Agent IDs who shared
- `views: number` - Total views
- `viralityScore: number` - 0-1 viral potential
- `engagementRate: number` - Engagement/views ratio

### Component: ParasocialBond
**Type:** `parasocial_bond` (sub-component of SocialMediaComponent)
**Purpose:** Tracks one-sided emotional relationship

**Properties:**
- `creatorId: string` - Target of parasocial relationship
- `intensity: number` - 0-100 bond strength
- `postsViewed: number` - Engagement history
- `postsLiked: number` - Like count
- `comments: number` - Comment count
- `emotionalAttachment: number` - 0-1 emotional investment
- `perceivedIntimacy: number` - 0-1 how well "knows" creator
- `type: BondType` - casual_fan, devoted_follower, superfan, parasocial_friend, obsessive
- `notifications: boolean` - Has notifications on
- `moodBoostFromContent: number` - Mood improvement from posts

## Systems

### System: SleepScrollingSystem
**Purpose:** Agents scroll social media during idle/sleep time
**Update Frequency:** During agent sleep phase

**Responsibilities:**
- Find sleeping/idle agents
- Generate personalized feed for each agent
- Simulate scrolling through 10-30 posts
- Generate engagement (like, comment, share)
- Update parasocial bonds based on engagement
- Track total scroll time

### System: ParasocialRelationshipSystem
**Purpose:** Manage fan-creator relationships
**Update Frequency:** After each engagement

**Responsibilities:**
- Update bond intensity with diminishing returns
- Apply personality gating (prevent obsession for most agents)
- Classify bond type (casual → devoted → superfan → obsessive)
- Trigger parasocial behaviors based on bond type
- Monitor for unhealthy obsession patterns
- Emit alerts if fan-zombie epidemic starts

### System: ContentGenerationSystem
**Purpose:** LLM-powered content creation
**Update Frequency:** Based on creator posting frequency

**Responsibilities:**
- Generate posts based on creator niche/personality
- Calculate virality score
- Respond to world events in content
- Create authentic content for creator brand
- Track top-performing posts

### System: FeedAlgorithmSystem
**Purpose:** Personalize content feeds
**Update Frequency:** On-demand when agent scrolls

**Responsibilities:**
- Score posts for relevance to agent
- Sort by: chronological, engagement, or personalized
- Weight by following status, parasocial bonds, content preferences
- Boost viral content
- Apply recency penalties

### System: InfluencerSpawningSystem
**Purpose:** Spawn city-based celebrities with existing followings
**Update Frequency:** One-time on city creation

**Responsibilities:**
- Spawn influencers with established follower counts
- Reverse-generate content back-catalog (50-200 posts)
- Create phantom followers (off-screen city residents)
- Assign village agents as local followers (5% of total)
- Place influencer in city

## Events

**Emits:**
- `social:post_created` - New content posted
- `social:viral_moment` - Post goes viral
- `social:bond_escalated` - Parasocial bond intensified
- `parasocial:obsessive_fan_detected` - Rare obsessive fan created
- `parasocial:stalking_behavior` - Obsessive fan attempts in-person meeting
- `social:influencer_spawned` - New city influencer arrives

**Listens:**
- `agent:sleep_started` - Begin sleep-time scrolling
- `agent:idle` - Check if should scroll during downtime
- `world:event` - Content creators respond to events

## Integration Points

- **DivineChatSystem** - Reuse chat infrastructure for comment threads
- **CommunicationTechSpec** - Requires Tier 4a (Cellular Network)
- **TVStationSpec** - Cross-promotion between TV and social media
- **MagicSystem** - Magical social media manipulation (optional endgame)
- **EconomySystem** - Influencer monetization, sponsorships
- **ReputationSystem** - Influencer reputation and influence

## Performance Considerations

- Limit concurrent LLM calls for post generation (max 10 per tick)
- Cache popular posts to avoid repeated queries
- Phantom followers don't need full agent simulation
- Only generate engagement for sampled subset of followers
- Archive old posts to reduce memory
- Rate-limit obsessive behaviors to prevent spam

## Dependencies

**Required:**
- CellularNetworkSystem (Tier 4a communication tech)
- AgentSystem (ensouled creators and consumers)
- EmploymentSystem (influencer as career path)

**Optional:**
- MagicSystem (magical manipulation endgame)
- DivinitySystem (divine algorithm control)
- TVStationSystem (cross-platform content)

## Open Questions

- [ ] Should algorithms be moddable by players?
- [ ] How to prevent fan-zombie epidemic in extreme cases?
- [ ] Should gods intervene automatically if obsession spreads?
- [ ] Encryption/privacy for direct messages?
- [ ] Cancel culture mechanics?

---

**Related Specs:**
- [TV Station Spec](tv-station.md) - Traditional media integration
- [Communication Tech Spec](tech-spec.md) - Required cellular infrastructure
- [Magic System](../magic-system/spec.md) - Magical social media manipulation
- [Divinity System](../divinity-system/spec.md) - Divine intervention
