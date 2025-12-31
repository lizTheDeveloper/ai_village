/**
 * LoadingText - Playful loading messages for multiverse initialization
 *
 * Fun, voice-consistent text that appears during various loading states.
 * Uses the four blended writer voices to make waiting feel less like waiting
 * and more like witnessing cosmic bureaucracy.
 */

export interface LoadingMessage {
  text: string;
  category: 'universe' | 'magic' | 'entities' | 'reality' | 'systems' | 'misc';
}

// Universe/Multiverse initialization
const UNIVERSE_MESSAGES: string[] = [
  'Checking universe for pre-existing civilizations... Found zero. Excellent.',
  "Negotiating with the fabric of spacetime... It's being difficult.",
  'Loading fundamental constants... Gravity still works. So far so good.',
  'Initializing causality... Effect will follow cause. Probably.',
  'Spinning up reality engine... This takes longer than it should.',
  'Consulting with the void... Void has no comment.',
  'Generating timeline... Time will now flow in one direction only.',
  'Reality.exe is loading... Please stand by while existence buffers.',
  'Unfolding dimensions... Found three spatial, one temporal. Standard configuration.',
  'Setting universal constants... π still irrational. Some things never change.',
];

// Magic system loading
const MAGIC_MESSAGES: string[] = [
  'Calibrating laws of magic... Reality is negotiable, apparently.',
  'Loading spell matrices... Magic works now. This will complicate things.',
  'Initializing mana flow... The universe now has a metaphysical plumbing system.',
  'Configuring arcane constants... Magic obeys rules. Flexible rules, but rules.',
  'Weaving reality loopholes... Exploits enabled. Use responsibly.',
  'Installing magical framework... Physics just got a competitor.',
  'Consulting tome of forbidden knowledge... Turns out most of it is just poorly documented.',
  'Blessing random objects with power... An arbitrary pebble is now legendary.',
  'Teaching rocks to remember things... Enchantment requires patience.',
  'Synchronizing with ley lines... Magical GPS is online.',
];

// Entity/Agent loading
const ENTITY_MESSAGES: string[] = [
  "Spawning mortals... They don't know they're in a simulation yet.",
  'Installing free will... Agents can now make questionable decisions.',
  'Generating personalities... Results may vary wildly.',
  'Teaching agents to want things... Desire engine: operational.',
  'Initializing social dynamics... Drama is inevitable.',
  'Loading conversation system... Agents can now argue about nothing.',
  'Distributing survival instincts... Most agents will try not to die.',
  'Installing memory formation... Agents will remember this. Eventually.',
  'Configuring emotional responses... Feelings are now a thing.',
  "Spawning villagers... They're confused but functional.",
];

// Reality/Physics loading
const REALITY_MESSAGES: string[] = [
  'Installing physics... Objects fall down now. This is working as intended.',
  'Initializing thermodynamics... Entropy will increase. Sorry.',
  'Loading collision detection... Things bounce off each other properly.',
  'Generating terrain... Mountains go up, valleys go down.',
  'Seeding resources... Trees, rocks, and arbitrary loot placement complete.',
  'Configuring day/night cycle... Sun goes up, sun goes down. Revolutionary.',
  'Installing weather patterns... Rain probability: yes.',
  'Loading biomes... Placing forests, deserts, and suspiciously convenient caves.',
  'Calculating orbital mechanics... Planet goes around sun. Still.',
  "Establishing atmosphere... Air is now breathable. You're welcome.",
];

// Game systems loading
const SYSTEMS_MESSAGES: string[] = [
  'Initializing building system... Walls can now prevent weather. Mostly.',
  'Loading crafting recipes... Hitting things creates better things.',
  'Installing farming mechanics... Plants grow when you remember to water them.',
  'Configuring trade system... Barter is ready. Currency is optional.',
  'Enabling skill progression... Practice makes slightly better.',
  'Loading social systems... Friendships and rivalries will spontaneously occur.',
  'Installing governance framework... Someone will want to be in charge.',
  'Configuring reputation system... Gossip is now quantified.',
  'Loading quest generation... Agents will find arbitrary goals meaningful.',
  'Initializing economy... Scarcity creates value. As designed.',
];

// Miscellaneous meta/funny messages
const MISC_MESSAGES: string[] = [
  'Hiding the fourth wall... Nothing to see here, mortals.',
  'Erasing evidence of previous simulation attempts... History is what we say it is.',
  'Instructing NPCs to act natural... Results pending.',
  'Loading "sense of wonder"... Installation at 73%. Close enough.',
  "Configuring dramatic irony... Players know things characters don't.",
  'Installing tutorial tooltips... Most will be ignored.',
  'Calibrating difficulty curve... Challenge level: "interesting".',
  'Loading save file corruption prevention... Mostly effective.',
  'Enabling emergent behavior... Prepare for surprises.',
  "Final checks before universe launch... Good luck. You'll need it.",
];

// All messages combined
const ALL_MESSAGES: LoadingMessage[] = [
  ...UNIVERSE_MESSAGES.map(text => ({ text, category: 'universe' as const })),
  ...MAGIC_MESSAGES.map(text => ({ text, category: 'magic' as const })),
  ...ENTITY_MESSAGES.map(text => ({ text, category: 'entities' as const })),
  ...REALITY_MESSAGES.map(text => ({ text, category: 'reality' as const })),
  ...SYSTEMS_MESSAGES.map(text => ({ text, category: 'systems' as const })),
  ...MISC_MESSAGES.map(text => ({ text, category: 'misc' as const })),
];

/**
 * Get a random loading message
 */
export function getRandomLoadingMessage(): LoadingMessage {
  return ALL_MESSAGES[Math.floor(Math.random() * ALL_MESSAGES.length)]!;
}

/**
 * Get a random loading message from a specific category
 */
export function getLoadingMessage(category: LoadingMessage['category']): LoadingMessage {
  const filtered = ALL_MESSAGES.filter(m => m.category === category);
  if (filtered.length === 0) return getRandomLoadingMessage();
  return filtered[Math.floor(Math.random() * filtered.length)]!;
}

/**
 * Get a sequence of loading messages (useful for multi-step loading)
 */
export function getLoadingSequence(count: number = 5): LoadingMessage[] {
  const shuffled = [...ALL_MESSAGES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Get messages for a specific loading phase
 */
export function getPhaseMessages(phase: 'universe' | 'magic' | 'world' | 'agents'): LoadingMessage[] {
  switch (phase) {
    case 'universe':
      return UNIVERSE_MESSAGES.map(text => ({ text, category: 'universe' }));
    case 'magic':
      return MAGIC_MESSAGES.map(text => ({ text, category: 'magic' }));
    case 'world':
      return [
        ...REALITY_MESSAGES.map(text => ({ text, category: 'reality' as const })),
        ...SYSTEMS_MESSAGES.map(text => ({ text, category: 'systems' as const })),
      ];
    case 'agents':
      return ENTITY_MESSAGES.map(text => ({ text, category: 'entities' }));
    default:
      return [getRandomLoadingMessage()];
  }
}
