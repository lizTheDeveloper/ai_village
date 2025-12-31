/**
 * Canon Event Descriptions
 *
 * Playful, memorable descriptions for significant moments in village history.
 * Uses the four blended writer voices to make major events feel meaningful and entertaining.
 *
 * Voices: Humane Satirist + Cosmic Pragmatist + Baroque Encyclopedist + Quiet Mythweaver
 */

/**
 * Generate a death event description based on cause
 */
export function describeDeathEvent(agentName: string, cause: string): {
  title: string;
  description: string;
} {
  // Map causes to playful descriptions
  const deathDescriptions: Record<string, (name: string) => string> = {
    starvation: (name) =>
      `${name} succumbed to hunger—the universe's blunt way of reminding mortals that food is non-negotiable. Despite all the complicated systems we've built, it turns out you still need to eat regularly. ${name} learned this the hard way.`,

    exhaustion: (name) =>
      `${name} worked until they stopped, which is apparently what happens when you ignore the body's increasingly urgent requests for rest. Dedication is admirable. Burnout is fatal. ${name} discovered where that line was.`,

    dehydration: (name) =>
      `${name} died of thirst, proving that even in a village surrounded by nature's bounty, basic survival still requires actually drinking water. The irony isn't lost on anyone, but ${name} is no longer available for comment.`,

    old_age: (name) =>
      `${name} reached the end—not suddenly, not dramatically, but in the quiet way that time eventually claims everyone. They had years. They used them. Now they're gone, leaving behind whatever marks they made and whoever remembers making them.`,

    accident: (name) =>
      `${name} died in an accident, which is the universe's term for "things went wrong in ways nobody planned for." It's sudden, it's unfair, and it's the kind of reminder that existence is more fragile than we pretend.`,

    illness: (name) =>
      `${name} fell ill and didn't recover. The body has limits, vulnerabilities, breaking points that care nothing for timing or convenience. ${name} found theirs.`,

    combat: (name) =>
      `${name} fell in combat—which is the polite way of saying someone killed them and they failed to prevent it. Violence has consequences. ${name} became one of them.`,

    default: (name) =>
      `${name} died from ${cause}. The specifics matter to those who knew them; the result is the same either way. They were here, and now they're not, and the village continues without them.`,
  };

  const describer = deathDescriptions[cause] ?? deathDescriptions.default;

  return {
    title: `${agentName}'s Death`,
    description: describer!(agentName),
  };
}

/**
 * Generate a first achievement event description
 */
export function describeFirstAchievement(achievementType: string, agentName?: string): {
  title: string;
  description: string;
} {
  const achievements: Record<string, { title: string; description: string }> = {
    first_building: {
      title: 'First Building Completed',
      description: `The village erected its first permanent structure${agentName ? `, led by ${agentName}` : ''}—moving from "temporary camp hoping not to die" to "slightly less temporary camp with walls." It's not much, but it's progress in the specific sense that walls keep weather out and provide the psychological comfort of being inside something. Architecture begins here.`,
    },
    first_harvest: {
      title: 'First Successful Harvest',
      description: `The first crop came in${agentName ? `, thanks to ${agentName}'s efforts` : ''}. Seeds went in the ground, time passed with appropriate amounts of water and sunlight, and food emerged. Agriculture works! This changes everything, mostly by reducing the daily terror of "will we find enough food today" to the seasonal terror of "will the harvest succeed."`,
    },
    first_tool: {
      title: 'First Tool Crafted',
      description: `Someone${agentName ? ` (${agentName})` : ''} figured out how to make a tool—combining materials with intention to create something more useful than its parts. This is the essence of technology: hitting problems with better rocks until the problems become manageable. It's working so far.`,
    },
    first_death: {
      title: 'First Death',
      description: `The village experienced its first death. Not unexpected—mortality is a design feature, not a bug—but there's a difference between knowing death exists and watching it happen to someone you knew. The village is smaller now. Quieter. More aware of what's at stake.`,
    },
    first_trade: {
      title: 'First Trade Completed',
      description: `Two people${agentName ? `, including ${agentName},` : ''} exchanged goods and both walked away feeling like they got the better deal, which is the fundamental magic of trade. Economics has entered the village, bringing with it concepts like "value," "negotiation," and "wondering if you got ripped off."`,
    },
  };

  return achievements[achievementType] || {
    title: `First ${achievementType}`,
    description: `The village achieved its first ${achievementType}. It's a milestone, which means it matters enough to remember but not enough to stop working. Progress is incremental, built from moments like this—small victories that add up to something larger over time.`,
  };
}

/**
 * Generate a deity emergence event description
 */
export function describeDeityEmergence(deityName: string, origin: string, domain: string): {
  title: string;
  description: string;
} {
  return {
    title: `${deityName} Manifests`,
    description: `${deityName} emerged from ${origin}—not invited, not expected, but suddenly, undeniably present. The air changed. Reality bent slightly around a new center of gravity. A god exists now, embodying ${domain}, aware and attentive. The village didn't plan for this. The village will have to adapt anyway. Divinity has arrived, and it's paying attention.`,
  };
}

/**
 * Generate a catastrophe event description
 */
export function describeCatastrophe(catastropheType: string, details?: string): {
  title: string;
  description: string;
} {
  const catastrophes: Record<string, string> = {
    famine: `Food ran out. Not "we're low on supplies"—actually out. Hunger arrived and stayed, a constant companion, a daily arithmetic problem with bodies as the cost. The village survived, barely, but everyone remembers the desperation of those days and what they were willing to do when starvation became real.`,
    plague: `Illness swept through the village like fire through dry grass. The healthy became sick, the sick became sicker, and some never recovered. Quarantine, desperate remedies, prayer—nothing stopped it entirely. It passed eventually, as plagues do, leaving behind empty spaces where people used to be.`,
    drought: `The rain stopped. Days became weeks, weeks became months, and water—always taken for granted—became the thing that decided who survived and who didn't. Crops failed. Wells ran dry. The village learned what scarcity actually means.`,
    fire: `Fire came—accidental, inevitable, catastrophic. Structures that took months to build burned in minutes. People fled with what they could carry. When it ended, smoke and ash marked where the village used to be. Rebuilding begins from less than nothing.`,
    default: `Catastrophe struck: ${details || catastropheType}. The kind of event that divides time into "before" and "after," that tests what a community is built on, that reveals who people are when everything goes wrong at once. The village survived, technically. Whether it recovered is a different question.`,
  };

  const description = catastrophes[catastropheType] ?? catastrophes.default;
  return {
    title: catastropheType.charAt(0).toUpperCase() + catastropheType.slice(1),
    description: description!,
  };
}

/**
 * Generate a marriage/partnership event description
 */
export function describeMarriage(agent1Name: string, agent2Name: string): {
  title: string;
  description: string;
} {
  return {
    title: `${agent1Name} & ${agent2Name}'s Union`,
    description: `${agent1Name} and ${agent2Name} formalized their partnership in whatever ceremony the village recognizes as binding. Two separate lives becoming one shared endeavor—promising to face the future together instead of alone. It's optimistic, in the way all partnerships are optimistic: betting that together is better than apart, that companionship matters, that tomorrow will come and they'll want to spend it together. The village witnessed it. The relationship continues.`,
  };
}

/**
 * Generate a birth event description
 */
export function describeBirth(parentName: string, childName: string): {
  title: string;
  description: string;
} {
  return {
    title: `${childName}'s Birth`,
    description: `${childName} was born to ${parentName}—which means the village is one person larger, one mouth hungrier, one future more uncertain. Birth brings hope and responsibility in equal measure: the possibility of what this new person might become, the reality of keeping them alive long enough to find out. The village grows. The stakes increase. Life continues.`,
  };
}

/**
 * Generate a major discovery event description
 */
export function describeDiscovery(discoveryType: string, discovererName?: string): {
  title: string;
  description: string;
} {
  const discoveries: Record<string, (name?: string) => string> = {
    iron: (name) =>
      `Someone${name ? ` (${name})` : ''} discovered iron—not just found it, but understood it: ore becomes metal becomes tools becomes the foundation of better tools. The Bronze Age is officially over. The village just unlocked an entire technology tree previously filed under "impossible." Progress accelerates.`,

    magic: (name) =>
      `${name ? `${name} discovered` : 'Someone discovered'} that magic is real, which raises more questions than it answers. The laws of reality apparently have loopholes, exploits, and APIs for those who know how to access them. The village's understanding of what's possible just expanded dramatically and uncomfortably.`,

    agriculture_advanced: (name) =>
      `Someone${name ? ` (${name})` : ''} figured out advanced agricultural techniques—crop rotation, selective breeding, irrigation systems. Food production just became less of a gamble and more of a science. Starvation risk drops. Population capacity increases. Civilization benefits from better farming, as always.`,

    default: (name) =>
      `The village discovered ${discoveryType}${name ? `, thanks to ${name}` : ''}. What was unknown is now known. What was impossible is now merely difficult. The future looks different than it did yesterday, full of possibilities that didn't exist before this moment.`,
  };

  const describer = discoveries[discoveryType] ?? discoveries.default;

  return {
    title: `Discovery: ${discoveryType}`,
    description: describer!(discovererName),
  };
}
