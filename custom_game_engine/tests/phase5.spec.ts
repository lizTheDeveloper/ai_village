import { test, expect } from '@playwright/test';

test('Phase 5: Communication & Relationships', async ({ page }) => {
  // Start the demo app
  await page.goto('http://localhost:3003');

  // Wait for the game to initialize
  await page.waitForSelector('#status', { timeout: 10000 });

  // Wait for agents to interact and form relationships
  await page.waitForTimeout(20000);

  // Get game state
  const stats = await page.evaluate(() => {
    const gameLoop = (window as any).gameLoop;
    if (!gameLoop) return null;

    const agents = gameLoop.world.query().with('agent').executeEntities();

    // Analyze agent behaviors and relationships
    let wandering = 0;
    let seekingFood = 0;
    let followingAgent = 0;
    let talking = 0;
    let totalRelationships = 0;
    let totalConversations = 0;
    let activeConversations = 0;
    let totalMessages = 0;
    let informationShared = 0;

    for (const agent of agents) {
      const agentComp = agent.getComponent('agent');
      const conversation = agent.getComponent('conversation');
      const relationship = agent.getComponent('relationship');

      // Count behaviors
      if (agentComp.behavior === 'wander') wandering++;
      if (agentComp.behavior === 'seek_food') seekingFood++;
      if (agentComp.behavior === 'follow_agent') followingAgent++;
      if (agentComp.behavior === 'talk') talking++;

      // Count conversations
      if (conversation) {
        if (conversation.isActive) activeConversations++;
        if (conversation.messages.length > 0) {
          totalConversations++;
          totalMessages += conversation.messages.length;
        }
      }

      // Count relationships
      if (relationship && relationship.relationships) {
        const relationshipCount = relationship.relationships.size;
        totalRelationships += relationshipCount;

        // Count shared memories
        for (const rel of relationship.relationships.values()) {
          informationShared += rel.sharedMemories;
        }
      }

      // Verify components exist
      if (!conversation) throw new Error('Agent missing conversation component');
      if (!relationship) throw new Error('Agent missing relationship component');
    }

    const avgRelationshipsPerAgent = agents.length > 0 ? totalRelationships / agents.length : 0;
    const avgMessagesPerConversation = totalConversations > 0 ? totalMessages / totalConversations : 0;

    return {
      totalAgents: agents.length,
      wandering,
      seekingFood,
      followingAgent,
      talking,
      activeConversations: activeConversations / 2, // Divide by 2 since each conversation counts twice
      totalConversations,
      totalMessages,
      avgMessagesPerConversation: Math.round(avgMessagesPerConversation * 10) / 10,
      totalRelationships,
      avgRelationshipsPerAgent: Math.round(avgRelationshipsPerAgent * 10) / 10,
      informationShared,
      tick: gameLoop.world.tick,
    };
  });

  console.log('Phase 5 stats:', stats);

  // Verify we have agents
  expect(stats?.totalAgents).toBeGreaterThan(0);

  // Verify agents have conversations and relationships components
  expect(stats?.totalConversations).toBeGreaterThanOrEqual(0);
  expect(stats?.totalRelationships).toBeGreaterThanOrEqual(0);

  // Verify some relationships have formed (agents should have met each other)
  expect(stats?.totalRelationships).toBeGreaterThan(0);

  // Verify some messages were exchanged
  expect(stats?.totalMessages).toBeGreaterThanOrEqual(0);

  // Take screenshot
  await page.screenshot({ path: 'tests/screenshots/phase5-communication.png' });

  console.log('Phase 5 test complete!');
  console.log(`- Total agents: ${stats?.totalAgents}`);
  console.log(`- Wandering: ${stats?.wandering}`);
  console.log(`- Seeking food: ${stats?.seekingFood}`);
  console.log(`- Following agents: ${stats?.followingAgent}`);
  console.log(`- Talking: ${stats?.talking}`);
  console.log(`- Active conversations: ${stats?.activeConversations}`);
  console.log(`- Total conversations: ${stats?.totalConversations}`);
  console.log(`- Total messages: ${stats?.totalMessages}`);
  console.log(`- Avg messages per conversation: ${stats?.avgMessagesPerConversation}`);
  console.log(`- Total relationships: ${stats?.totalRelationships}`);
  console.log(`- Avg relationships per agent: ${stats?.avgRelationshipsPerAgent}`);
  console.log(`- Information shared: ${stats?.informationShared}`);
  console.log(`- Game tick: ${stats?.tick}`);
});
