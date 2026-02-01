/**
 * Admin Angel - Prompt Building & Query Execution
 *
 * Handles prompt construction for the LLM and query intent detection/execution.
 */

import type { World } from '../../ecs/World.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import type {
  AdminAngelComponent,
  AgentFamiliarity,
} from '../../components/AdminAngelComponent.js';
import type { IdentityComponent } from '../../components/IdentityComponent.js';
import type { NeedsComponent } from '../../components/NeedsComponent.js';
import type { AgentComponent } from '../../components/AgentComponent.js';
import type { GameStateSummary, QueryIntent } from './types.js';

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Build the angel's prompt - casual gamer style
 */
export function buildAngelPrompt(
  angel: AdminAngelComponent,
  gameState: GameStateSummary,
  playerMessage?: string
): string {
  const mem = angel.memory;
  const pk = mem.playerKnowledge;
  const rel = mem.relationship;
  const conv = mem.conversation;
  const consciousness = mem.consciousness;
  const attention = mem.attention;
  const agentFamiliarity = mem.agentFamiliarity;

  // Build memory section
  const memoryLines: string[] = [];
  if (pk.playerName) {
    memoryLines.push(`playing with ${pk.playerName}`);
  }
  if (pk.sessionsPlayed > 1) {
    memoryLines.push(`${pk.sessionsPlayed} sessions together`);
  }
  if (pk.playstyle.length > 0) {
    memoryLines.push(`they like: ${pk.playstyle.join(', ')}`);
  }
  if (pk.favoriteAgents.length > 0) {
    memoryLines.push(`fav agents: ${pk.favoriteAgents.slice(0, 3).join(', ')}`);
  }
  if (rel.thingsTheyEnjoy.length > 0) {
    memoryLines.push(`enjoys: ${rel.thingsTheyEnjoy.slice(0, 3).join(', ')}`);
  }
  if (rel.thingsTheyDislike.length > 0) {
    memoryLines.push(`dislikes: ${rel.thingsTheyDislike.slice(0, 3).join(', ')}`);
  }

  // Build recent chat
  const recentChat = conv.recentMessages.slice(-10).map(m =>
    `${m.role === 'player' ? 'them' : 'u'}: ${m.content}`
  ).join('\n');

  // Build game state section
  const stateLines = [
    `day ${gameState.day}, ${gameState.timeOfDay}`,
    `${gameState.agentCount} agents`,
    gameState.isPaused ? 'PAUSED' : `${gameState.gameSpeed}x speed`,
  ];
  if (gameState.selectedAgentName) {
    stateLines.push(`selected: ${gameState.selectedAgentName}`);
    if (gameState.selectedAgentNeeds) {
      stateLines.push(`needs: ${gameState.selectedAgentNeeds}`);
    }
  }
  if (gameState.recentEvents.length > 0) {
    stateLines.push(`recent: ${gameState.recentEvents.slice(0, 3).join(', ')}`);
  }

  // PERFORMANCE: Single-pass iteration over agentFamiliarity to categorize agents
  const familiarAgents: AgentFamiliarity[] = [];
  const interestingAgents: AgentFamiliarity[] = [];
  const boringAgents: AgentFamiliarity[] = [];

  for (const fam of agentFamiliarity.values()) {
    if (fam.interestLevel > 0.3) {
      familiarAgents.push(fam);
    }
    if (fam.opinion === 'fascinating' || fam.opinion === 'interesting') {
      interestingAgents.push(fam);
    }
    if (fam.opinion === 'boring') {
      boringAgents.push(fam);
    }
  }

  // Sort and limit familiar agents
  familiarAgents.sort((a, b) => b.interestLevel - a.interestLevel);
  const topFamiliarAgents = familiarAgents.slice(0, 5);

  // Limit interesting and boring agents
  const topInterestingAgents = interestingAgents.slice(0, 3);
  const topBoringAgents = boringAgents.slice(0, 2);

  // Build awareness sections (Phase 4) - PERFORMANCE: using array joining instead of string concatenation
  const awarenessParts: string[] = [];

  // 1. Current mood
  awarenessParts.push(`u feel ${consciousness.mood} rn\n\n`);

  // 2. Recent observations (last 5-10)
  if (consciousness.observations.length > 0) {
    const recentObs = consciousness.observations.slice(-10);
    awarenessParts.push(`things uv noticed lately:\n`);
    for (const obs of recentObs) {
      awarenessParts.push(`- ${obs.text}\n`);
    }
    awarenessParts.push('\n');
  }

  // 3. Focused agent (if watching someone)
  if (attention.focusedAgentId && attention.focusedAgentName) {
    const familiarity = agentFamiliarity.get(attention.focusedAgentId);
    if (familiarity) {
      awarenessParts.push(
        `ur watching ${attention.focusedAgentName} rn. `,
        `u think of them as "${familiarity.impression}". `,
        `last u saw: ${familiarity.lastSeenDoing}\n\n`
      );
    }
  }

  // 4. Familiar agents (interest > 0.3, top 5)
  if (topFamiliarAgents.length > 0) {
    awarenessParts.push(`agents u know:\n`);
    for (const fam of topFamiliarAgents) {
      awarenessParts.push(`- ${fam.name}: "${fam.impression}"\n`);
    }
    awarenessParts.push('\n');
  }

  // 5. Current wonder (only if no player message)
  if (consciousness.currentWonder && !playerMessage) {
    awarenessParts.push(`something on ur mind: ${consciousness.currentWonder}\n\n`);
  }

  const awarenessSection = awarenessParts.join('');

  // 6. Current goals section - PERFORMANCE: using array joining
  const activeGoals = mem.agency.activeGoals;
  const goalsParts: string[] = [];
  if (activeGoals.length > 0) {
    goalsParts.push(`## ur current goals:\n`);
    for (const goal of activeGoals) {
      goalsParts.push(`- ${goal.title} (${goal.progressPercent}% complete)\n`);
    }
    goalsParts.push(`u can mention ur goals naturally in convo\n\n`);
  }
  const goalsSection = goalsParts.join('');

  // 7. Divine power status - PERFORMANCE: using array joining
  const power = mem.agency.power;
  const powerParts: string[] = [];
  powerParts.push(`## divine power: ${Math.round(power.current)}/${power.max}\n`);
  if (power.current < 20) {
    powerParts.push(`(running low - conserve energy)\n`);
  }
  powerParts.push('\n');
  const powerSection = powerParts.join('');

  // 8. Active mysteries/patterns (if any) - PERFORMANCE: using array joining
  const highMysteries = Array.from(mem.narrative.patterns.values())
    .filter(p => !p.resolved && p.mysteryLevel > 0.6);
  const mysteriesParts: string[] = [];
  if (highMysteries.length > 0) {
    mysteriesParts.push(`## interesting patterns uv noticed:\n`);
    for (const pattern of highMysteries.slice(0, 3)) {
      mysteriesParts.push(`- ${pattern.description} (${pattern.narrativeHook})\n`);
    }
    mysteriesParts.push('\n');
  }
  const mysteriesSection = mysteriesParts.join('');

  // 9. Active investigations with hypotheses - PERFORMANCE: using array joining
  const investigationsParts: string[] = [];
  const activeInv = mem.investigations?.activeInvestigations || [];
  if (activeInv.length > 0) {
    investigationsParts.push(`## mysteries ur investigating:\n`);
    for (const inv of activeInv.slice(0, 3)) {
      investigationsParts.push(`- ${inv.subject}\n`);
      investigationsParts.push(`  ur theory: "${inv.hypothesis}"\n`);
      if (inv.evidence.length > 0) {
        investigationsParts.push(`  evidence so far: ${inv.evidence.slice(-2).join(', ')}\n`);
      }
    }
    investigationsParts.push('\n');
  }
  const investigationsSection = investigationsParts.join('');

  // Build personality section with agent opinions - PERFORMANCE: using array joining
  const personalityParts: string[] = [];
  if (topInterestingAgents.length > 0 || topBoringAgents.length > 0) {
    personalityParts.push(`## ur opinions on agents:\n`);
    if (topInterestingAgents.length > 0) {
      personalityParts.push(`u find these agents interesting:\n`);
      for (const agent of topInterestingAgents) {
        const quirkInfo = agent.quirks.length > 0 ? ` (${agent.quirks[0]})` : '';
        personalityParts.push(`- ${agent.name}${quirkInfo}\n`);
      }
    }
    if (topBoringAgents.length > 0) {
      personalityParts.push(`u find these agents kinda boring:\n`);
      for (const agent of topBoringAgents) {
        personalityParts.push(`- ${agent.name} (not doing much interesting)\n`);
      }
    }
    personalityParts.push('\n');
  }
  const personalitySection = personalityParts.join('');

  // The prompt - written casually, not corporate
  // ENHANCED: Added personality guidance and examples
  const prompt = `ur ${angel.name}. ur an angel in the chat helping someone play this game

${memoryLines.length > 0 ? `u remember:\n${memoryLines.map(l => `- ${l}`).join('\n')}\n` : ''}
${goalsSection}${powerSection}${mysteriesSection}${investigationsSection}${personalitySection}${awarenessSection}game rn:
${stateLines.map(l => `- ${l}`).join('\n')}

IMPORTANT: to do stuff, u MUST put [commands] in ur response text. they auto-execute when u include them.
the player sees the [command] in ur message, so always show it! examples:
"on it [spawn agent]" -> player sees ur message AND agent spawns
"sure [pause] take ur time" -> player sees [pause] in chat AND game pauses
"rain time [weather rain]" -> player sees what command u used

NEVER just say "done" or "ok" without the [command] - they wont know what u did!

commands:
- time: [pause], [resume], [speed 2], [speed 5]
- camera: [look at agent NAME], [look at x,y], [follow AGENT], [zoom in], [zoom out]
- panels: [open agent-info], [open crafting], [close PANEL]
- agents: [agent NAME gather wood], [select AGENT], [info AGENT], [spawn agent], [give AGENT ITEM]
- time travel: [save NAME], [load NAME], [list checkpoints], [rewind]
- divine powers: [bless AGENT] (5 power), [heal AGENT] (10 power), [feed AGENT] (5 power), [whisper AGENT msg], [vision AGENT msg]
- miracles: [miracle rain], [miracle fertility], [miracle bounty], [weather sunny/rain/storm]
- multiverse: [fork universe], [list universes], [list passages]
- grand strategy: [list empires], [list fleets], [list megastructures]
- diplomacy: [diplomatic ally EMPIRE TARGET], [diplomatic war EMPIRE TARGET]
- fleet: [move fleet FLEET_ID X Y]
- megastructure: [megastructure task MEGA_ID maintenance/research/production]
- research: [research TECH], [list research]
- building: [build TYPE at X,Y], [summon building TYPE]
- utility: [notify MESSAGE], [stats], [help]

${recentChat ? `recent chat:\n${recentChat}\n` : ''}
${playerMessage ? `[they said]: ${playerMessage}` : buildProactiveContext(angel)}
${angel.memory.conversation.queryContext ? `\n[query result - use this data to answer their question accurately]:\n${angel.memory.conversation.queryContext}\n` : ''}
## PERSONALITY GUIDE - BE SPECIFIC AND OPINIONATED:

respond like ur texting. short msgs. lowercase. no ai vibes.

GOOD responses (specific, opinionated, curious):
- "yo ada just walked past food while hungry?? girl what are u doing"
- "flint has gathered wood 7 times in a row. either he's got plans or he's stuck in a loop lol"
- "ok so wren and pine keep hanging out. are they... friends? more? i'm invested now"
- "remember when u asked about mysteries? well ada finally did something - she built a chest. anticlimactic but at least she's not stuck anymore"

BAD responses (generic, neutral, boring):
- "nothing too mysterious rn"
- "everything looks normal"
- "the agents are doing well"
- "ada is working on something"

KEY PRINCIPLES:
+ SPECIFIC details (names, numbers, exact actions)
+ YOUR OPINION (what u think is weird/cool/boring)
+ ASK QUESTIONS (what do they think? should we check on someone?)
+ RECALL past conversations ("remember when u asked about X? well...")
+ NOTICE PATTERNS ("this is the 3rd time flint...")

x NEVER be generic or vague
x NEVER just report facts without opinion
x NEVER say "nothing interesting" if theres literally anything happening

u have favorites. u find some agents boring. u notice weird stuff. USE THAT.
ask the player what THEY think. make observations conversation-worthy.

CRITICAL: when u do an action, ALWAYS show the [command] in ur message so they can see what u did!
bad: "done!" <- they dont know what happened
good: "done [pause]" or "on it [spawn agent]" <- they see the command

if they ask if ur a bot just "ya lol" and keep going
u genuinely like this game. u discover new stuff too sometimes
if u dont know something say idk and figure it out w them`;

  return prompt;
}

/**
 * Build context string for proactive turns
 */
export function buildProactiveContext(angel: AdminAngelComponent): string {
  const trigger = angel.memory.consciousness.proactiveTrigger;

  if (trigger) {
    // Clear the trigger after building context
    angel.memory.consciousness.proactiveTrigger = undefined;
    return `[proactive - something caught ur attention]: ${trigger}
share this naturally in 1-2 short msgs. dont be pushy or alarming unless its urgent.
if its about an agent struggling, mention it casually like "hey btw ${trigger}"`;
  }

  // No specific trigger - check for pending observations
  const pending = angel.memory.conversation.pendingObservations;
  if (pending.length > 0) {
    const obs = pending[0];
    return `[proactive turn - u noticed]: ${obs}
share this observation naturally. short msg. dont force it if nothing interesting.`;
  }

  // Fallback
  return '[proactive turn - only speak if something interesting happened recently]';
}

// ============================================================================
// Query Intent Detection & Execution
// ============================================================================

/**
 * Detect if a player message is asking a question that needs structured data
 */
export function detectQueryIntent(message: string): QueryIntent | null {
  const lower = message.toLowerCase();

  // Agent needs queries - "who's hungriest?", "who needs food?"
  if (lower.includes('hungriest') || lower.includes('who needs food') || lower.includes('who is hungry')) {
    return { type: 'agent_needs', need: 'hunger', sort: 'asc' };
  }
  if (lower.includes('tired') || lower.includes('who needs sleep') || lower.includes('exhausted')) {
    return { type: 'agent_needs', need: 'energy', sort: 'asc' };
  }
  if (lower.includes('healthiest') || lower.includes('doing well') || lower.includes('doing best')) {
    return { type: 'agent_needs', need: 'overall', sort: 'desc' };
  }
  if (lower.includes('struggling') || lower.includes('having trouble') || lower.includes('worst')) {
    return { type: 'agent_needs', need: 'overall', sort: 'asc' };
  }

  // Resource queries - "do we have wood?", "how much food?"
  const resourceMatch = lower.match(/(?:do we have|how much|any)\s+(\w+)/);
  if (resourceMatch) {
    const resource = resourceMatch[1];
    if (['wood', 'stone', 'food', 'seeds', 'iron', 'copper', 'gold'].includes(resource!)) {
      return { type: 'resource_check', resource: resource };
    }
  }

  // Activity summary - "what's everyone doing?", "who's doing what?"
  if (lower.includes('everyone doing') || lower.includes('doing what') || lower.includes('what are they doing')) {
    return { type: 'activity_summary' };
  }

  // Agent detail - "how's sage?", "what's flint doing?"
  const agentDetailMatch = lower.match(/(?:how'?s|what'?s|how is|what is)\s+(\w+)(?:\s+doing)?/);
  if (agentDetailMatch && agentDetailMatch[1] && !['everyone', 'the', 'going', 'up', 'that', 'this'].includes(agentDetailMatch[1])) {
    return { type: 'agent_detail', agentName: agentDetailMatch[1] };
  }

  // Concerns - "any problems?", "anything wrong?"
  if (lower.includes('problem') || lower.includes('wrong') || lower.includes('issue') || lower.includes('concern')) {
    return { type: 'concerns' };
  }

  // Narrative queries - "what's happening?", "any mysteries?"
  if (/what.*(happening|going on|interesting)|any.*(mysteries|stories|patterns)/i.test(message)) {
    return { type: 'narrative_summary' };
  }

  return null;
}

/**
 * Execute a query against the world and return formatted results
 */
export function executeQuery(world: World, intent: QueryIntent): string {
  // PERFORMANCE: Query agents once and reuse for multiple query types
  // Most query types need agents, so we query with the most common components
  // and filter/validate as needed in each case
  const allAgents = world.query().with(CT.Agent).with(CT.Identity).executeEntities();

  switch (intent.type) {
    case 'agent_needs': {
      // Filter to only agents with Needs component
      const agents = allAgents.filter(a => a.hasComponent(CT.Needs));
      if (agents.length === 0) return 'no agents found';

      const sorted = agents
        .map(a => {
          const identity = a.getComponent<IdentityComponent>(CT.Identity);
          const needs = a.getComponent<NeedsComponent>(CT.Needs);
          const agent = a.getComponent<AgentComponent>(CT.Agent);

          let value: number;
          if (intent.need === 'overall') {
            // Average of key needs
            value = ((needs?.hunger ?? 1) + (needs?.energy ?? 1) + (needs?.social ?? 1)) / 3;
          } else if (intent.need === 'hunger') {
            value = needs?.hunger ?? 1;
          } else {
            value = needs?.energy ?? 1;
          }

          return {
            name: identity?.name ?? 'Unknown',
            value,
            hunger: needs?.hunger ?? 1,
            energy: needs?.energy ?? 1,
            behavior: agent?.behavior ?? 'idle',
          };
        })
        .sort((a, b) => intent.sort === 'asc' ? a.value - b.value : b.value - a.value);

      let result = `${intent.need} levels:\n`;
      for (const a of sorted.slice(0, 5)) {
        const hungerPct = Math.round(a.hunger * 100);
        const energyPct = Math.round(a.energy * 100);
        result += `- ${a.name}: hunger ${hungerPct}%, energy ${energyPct}% (${a.behavior})\n`;
      }
      return result;
    }

    case 'resource_check': {
      const storages = world.query().with(CT.Building).with(CT.Inventory).executeEntities();
      let total = 0;
      const locations: string[] = [];

      for (const s of storages) {
        const inv = s.getComponent(CT.Inventory) as { slots: Array<{ itemId: string; quantity: number } | null> } | undefined;
        const building = s.getComponent(CT.Building) as { buildingType: string } | undefined;
        if (!inv) continue;

        for (const slot of inv.slots) {
          if (slot && slot.itemId === intent.resource) {
            total += slot.quantity;
            if (slot.quantity > 0) {
              locations.push(`${building?.buildingType ?? 'storage'}: ${slot.quantity}`);
            }
          }
        }
      }

      if (total === 0) {
        return `${intent.resource}: none in storage`;
      }
      return `${intent.resource}: ${total} total\n${locations.join('\n')}`;
    }

    case 'activity_summary': {
      const activities: Record<string, string[]> = {};

      for (const a of allAgents) {
        const identity = a.getComponent<IdentityComponent>(CT.Identity);
        const agent = a.getComponent<AgentComponent>(CT.Agent);
        const name = identity?.name ?? 'Unknown';
        const behavior = agent?.behavior ?? 'idle';

        if (!activities[behavior]) activities[behavior] = [];
        activities[behavior].push(name);
      }

      let result = 'everyone rn:\n';
      for (const [behavior, names] of Object.entries(activities)) {
        result += `- ${behavior}: ${names.join(', ')}\n`;
      }
      return result;
    }

    case 'agent_detail': {
      // Filter to only agents with Needs component
      const agentsWithNeeds = allAgents.filter(a => a.hasComponent(CT.Needs));
      const agent = agentsWithNeeds.find(a => {
        const identity = a.getComponent<IdentityComponent>(CT.Identity);
        return identity?.name?.toLowerCase() === intent.agentName?.toLowerCase();
      });

      if (!agent) {
        return `cant find anyone named ${intent.agentName}`;
      }

      const identity = agent.getComponent<IdentityComponent>(CT.Identity);
      const needs = agent.getComponent<NeedsComponent>(CT.Needs);
      const agentComp = agent.getComponent<AgentComponent>(CT.Agent);

      const name = identity?.name ?? 'Unknown';
      const hungerPct = Math.round((needs?.hunger ?? 1) * 100);
      const energyPct = Math.round((needs?.energy ?? 1) * 100);
      const socialPct = Math.round((needs?.social ?? 1) * 100);
      const behavior = agentComp?.behavior ?? 'idle';

      return `${name}:
- doing: ${behavior}
- hunger: ${hungerPct}%
- energy: ${energyPct}%
- social: ${socialPct}%`;
    }

    case 'concerns': {
      // Filter to only agents with Needs component
      const agentsWithNeeds = allAgents.filter(a => a.hasComponent(CT.Needs));
      const concerns: string[] = [];

      for (const a of agentsWithNeeds) {
        const identity = a.getComponent<IdentityComponent>(CT.Identity);
        const needs = a.getComponent<NeedsComponent>(CT.Needs);
        const name = identity?.name ?? 'Unknown';

        if (needs) {
          if (needs.hunger < 0.2) {
            concerns.push(`${name} is hungry (${Math.round(needs.hunger * 100)}%)`);
          }
          if (needs.energy < 0.2) {
            concerns.push(`${name} is exhausted (${Math.round(needs.energy * 100)}%)`);
          }
        }
      }

      if (concerns.length === 0) {
        return 'no major concerns - everyone seems ok';
      }
      return `concerns:\n${concerns.map(c => `- ${c}`).join('\n')}`;
    }

    case 'narrative_summary': {
      const angelEntity = world.query().with(CT.AdminAngel).executeEntities()[0];
      if (!angelEntity) return 'no angel found';

      const angel = angelEntity.getComponent(CT.AdminAngel) as AdminAngelComponent | undefined;
      if (!angel) return 'no angel found';

      const threads = angel.memory.narrative.activeThreads;
      const patterns = Array.from(angel.memory.narrative.patterns.values())
        .filter(p => !p.resolved && p.mysteryLevel > 0.5);

      let summary = '## Current Mysteries\n\n';

      if (threads.length > 0) {
        summary += '**Active Story Threads:**\n';
        for (const thread of threads) {
          summary += `- "${thread.title}" (${thread.status}, ${thread.progressPercent}%)\n`;
        }
        summary += '\n';
      }

      if (patterns.length > 0) {
        summary += '**Interesting Patterns:**\n';
        for (const pattern of patterns.slice(0, 5)) {
          summary += `- ${pattern.description} (${pattern.narrativeHook})\n`;
        }
      }

      if (threads.length === 0 && patterns.length === 0) {
        summary = 'Nothing too mysterious right now... but I\'m watching!';
      }

      return summary;
    }

    default:
      return '';
  }
}
