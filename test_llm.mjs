import fetch from 'node-fetch';

// Test the LLM with function calling
async function testLLM() {
  const tools = [
    {
      type: 'function',
      function: {
        name: 'wander',
        description: 'Explore the area, move around randomly',
        parameters: { type: 'object', properties: {} }
      }
    },
    {
      type: 'function',
      function: {
        name: 'idle',
        description: 'Do nothing, rest and recover energy',
        parameters: { type: 'object', properties: {} }
      }
    }
  ];

  const prompt = `You are Bob, a villager in a forest village.

Personality:
- You are curious and adventurous
- You are outgoing and social

Current Situation:
- Hunger: 98% (satisfied)
- Energy: 99% (rested)
- The area around you is empty

Recent Memories:
1. agent_seen

Available Actions:
- wander - Explore the area
- idle - Do nothing, rest and recover

What should you do? Don't overthink - give your gut reaction and choose an action.

Your response:`;

  console.log('Sending request to Ollama...\n');

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'qwen3:4b',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      tools: tools,
      options: {
        temperature: 0.7,
        num_predict: 2000,
      },
    }),
  });

  const data = await response.json();

  console.log('Raw response:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n---\n');

  // Extract components
  const message = data.message || {};
  const thinking = message.thinking || '';
  const speaking = message.content || '';
  const toolCalls = message.tool_calls || [];
  const action = toolCalls.length > 0 ? toolCalls[0].function.name : '';

  console.log('Extracted components:');
  console.log('Thinking:', thinking || '(none)');
  console.log('Speaking:', speaking || '(none)');
  console.log('Action:', action || '(none)');
  console.log('\n---\n');

  const result = {
    thinking: thinking,
    speaking: speaking,
    action: action
  };

  console.log('Final structured result:');
  console.log(JSON.stringify(result, null, 2));
}

testLLM().catch(console.error);
